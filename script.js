window.addEventListener('load', async () => {
    const savedApiKey = localStorage.getItem('openai_api_key');
    
    if (savedApiKey) {
        document.getElementById('apiKey').value = savedApiKey;
    }
    
    // Auto-load the condensed resume file
    try {
        const response = await fetch('RESUME_KEYWORDS_COMPACT.md');
        if (response.ok) {
            const resumeText = await response.text();
            document.getElementById('resume').value = resumeText;
            localStorage.setItem('user_resume', resumeText);
        }
    } catch (error) {
        // Fallback to saved resume if file not found
        const savedResume = localStorage.getItem('user_resume');
        if (savedResume) {
            document.getElementById('resume').value = savedResume;
        }
    }
});

document.getElementById('apiKey').addEventListener('change', (e) => {
    localStorage.setItem('openai_api_key', e.target.value);
});

document.getElementById('resume').addEventListener('change', (e) => {
    localStorage.setItem('user_resume', e.target.value);
});

let extractedCompanyName = '';

async function generateCoverLetter() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const resume = document.getElementById('resume').value.trim();
    const jobInfo = document.getElementById('jobInfo').value.trim();
    const jobDescription = document.getElementById('jobDescription').value.trim();

    if (!apiKey) {
        alert('Please enter your OpenAI API key');
        return;
    }

    if (!resume) {
        alert('Please paste your resume');
        return;
    }

    if (!jobInfo) {
        alert('Please enter company name and job title');
        return;
    }

    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('result').classList.add('hidden');
    document.getElementById('generateBtn').disabled = true;

    try {
        const prompt = createPrompt(resume, jobInfo, jobDescription);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional cover letter writer. ABSOLUTE RULES YOU MUST FOLLOW: 1) NEVER EVER use the dash character (including hyphen -, em dash —, en dash –, minus −) ANYWHERE in your response. 2) If you need to connect words or ideas, use commas, semicolons, or write separate sentences instead. 3) NEVER use bullet points or list formatting. 4) Write ONLY in complete flowing paragraphs. 5) Before outputting, scan your entire response and replace every single dash with a comma or period. 6) Start with "Greetings," and end with "Regards, Siddharth Samir Khachane". 7) Do NOT include dates. 8) Keep it SHORT (3-4 paragraphs). ZERO DASHES ALLOWED IN YOUR OUTPUT.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 800
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to generate cover letter');
        }

        const data = await response.json();
        let coverLetter = data.choices[0].message.content;

        // Aggressive post-processing to remove ALL types of dashes
        coverLetter = coverLetter.replace(/—/g, ', '); // em dash
        coverLetter = coverLetter.replace(/–/g, ', '); // en dash
        coverLetter = coverLetter.replace(/−/g, ', '); // minus sign
        coverLetter = coverLetter.replace(/\s+-\s+/g, ', '); // spaced hyphen
        coverLetter = coverLetter.replace(/(\w)-(\w)/g, '$1 $2'); // word-word to word word
        
        // Extract company name for filename (first word)
        extractedCompanyName = jobInfo.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');

        document.getElementById('coverLetterText').textContent = coverLetter;
        document.getElementById('result').classList.remove('hidden');
        
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('generateBtn').disabled = false;
    }
}

function createPrompt(resume, jobInfo, jobDescription) {
    let prompt = `Generate a SHORT and concise professional cover letter.\n\n`;
    prompt += `Job Information: ${jobInfo}\n`;
    prompt += `(Extract the company name and job title from the above. The company name is usually the first word or words.)\n\n`;
    
    if (jobDescription) {
        prompt += `Job Description:\n${jobDescription}\n\n`;
    }
    
    prompt += `Candidate's Resume:\n${resume}\n\n`;
    prompt += `CRITICAL MANDATORY INSTRUCTIONS:\n`;
    prompt += `1. NEVER use dashes, hyphens, em dashes, en dashes, or minus signs ANYWHERE\n`;
    prompt += `2. Use commas, semicolons, or periods instead of dashes\n`;
    prompt += `3. Start with "Greetings,"\n`;
    prompt += `4. End with "Regards, Siddharth Samir Khachane"\n`;
    prompt += `5. Do NOT include any date\n`;
    prompt += `6. Keep it SHORT (3 to 4 paragraphs only)\n`;
    prompt += `7. Express genuine interest in the position at the company\n`;
    prompt += `8. Highlight the most relevant experience and skills\n`;
    prompt += `9. Write ONLY in complete flowing paragraphs\n`;
    prompt += `10. NEVER use bullet points or lists\n`;
    prompt += `11. Before you output, check for ANY dash character and replace it\n\n`;
    prompt += `REMEMBER: ABSOLUTELY ZERO DASHES IN THE ENTIRE LETTER.`;
    
    return prompt;
}

function copyToClipboard() {
    const text = document.getElementById('coverLetterText').textContent;
    navigator.clipboard.writeText(text).then(() => {
        alert('Cover letter copied to clipboard!');
    }).catch(err => {
        alert('Failed to copy: ' + err);
    });
}

function downloadAsText() {
    const text = document.getElementById('coverLetterText').textContent;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = extractedCompanyName ? `${extractedCompanyName}_cover_letter.txt` : 'cover_letter.txt';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadAsPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const text = document.getElementById('coverLetterText').textContent;
    
    // Professional PDF formatting
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margins = 25;
    const maxLineWidth = pageWidth - (margins * 2);
    const lineHeight = 7;
    
    // Split text into paragraphs
    const paragraphs = text.split('\n\n').filter(p => p.trim() !== '');
    
    let yPosition = margins;
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    
    paragraphs.forEach((paragraph, index) => {
        // Split paragraph into lines that fit the page width
        const lines = doc.splitTextToSize(paragraph.trim(), maxLineWidth);
        
        // Check if we need a new page
        if (yPosition + (lines.length * lineHeight) > pageHeight - margins) {
            doc.addPage();
            yPosition = margins;
        }
        
        // Add the lines
        lines.forEach(line => {
            doc.text(line, margins, yPosition);
            yPosition += lineHeight;
        });
        
        // Add space between paragraphs (but not after the last one)
        if (index < paragraphs.length - 1) {
            yPosition += lineHeight * 1.5;
        }
    });
    
    const filename = extractedCompanyName ? `${extractedCompanyName}_cover_letter.pdf` : 'cover_letter.pdf';
    doc.save(filename);
}
