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

async function generateCoverLetter() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const resume = document.getElementById('resume').value.trim();
    const companyName = document.getElementById('companyName').value.trim();
    const jobTitle = document.getElementById('jobTitle').value.trim();
    const jobDescription = document.getElementById('jobDescription').value.trim();

    if (!apiKey) {
        alert('Please enter your OpenAI API key');
        return;
    }

    if (!resume) {
        alert('Please paste your resume');
        return;
    }

    if (!companyName) {
        alert('Please enter the company name');
        return;
    }

    if (!jobTitle) {
        alert('Please enter the job title');
        return;
    }

    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('result').classList.add('hidden');
    document.getElementById('generateBtn').disabled = true;

    try {
        const prompt = createPrompt(resume, companyName, jobTitle, jobDescription);
        
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
                        content: 'You are a professional cover letter writer. Create compelling, personalized cover letters that highlight relevant experience and skills. Write in a professional yet personable tone. ABSOLUTELY NEVER use dashes, hyphens, minus signs, bullet points, or any list formatting in your responses. Write ONLY in complete paragraphs with flowing sentences. The letter should be concise and short. Start with "Greetings," and end with "Regards, Siddharth Samir Khachane". Do NOT include any date. Use full sentences throughout the entire letter in paragraph form only. NO DASHES OR HYPHENS ANYWHERE.'
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
        const coverLetter = data.choices[0].message.content;

        document.getElementById('coverLetterText').textContent = coverLetter;
        document.getElementById('result').classList.remove('hidden');
        
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('generateBtn').disabled = false;
    }
}

function createPrompt(resume, companyName, jobTitle, jobDescription) {
    let prompt = `Generate a SHORT and concise professional cover letter for the following:\n\n`;
    prompt += `Company: ${companyName}\n`;
    prompt += `Position: ${jobTitle}\n\n`;
    
    if (jobDescription) {
        prompt += `Job Description:\n${jobDescription}\n\n`;
    }
    
    prompt += `Candidate's Resume:\n${resume}\n\n`;
    prompt += `CRITICAL Instructions:\n`;
    prompt += `The letter MUST start with "Greetings," and end with "Regards, Siddharth Samir Khachane". Do NOT include any date anywhere in the letter. Keep the letter SHORT and concise (around 3 to 4 paragraphs). Express genuine interest in the ${jobTitle} position at ${companyName}. Highlight the most relevant experience and skills from the resume that match this role. Make it professional and persuasive. Use ONLY complete paragraphs with flowing sentences. ABSOLUTELY NEVER use dashes, hyphens, minus signs, bullet points, or any form of lists anywhere in the letter. Write everything in flowing paragraph format with NO DASHES OR HYPHENS.`;
    
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
    a.download = 'cover_letter.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadAsPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const text = document.getElementById('coverLetterText').textContent;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margins = 20;
    const maxLineWidth = pageWidth - margins * 2;
    
    const lines = doc.splitTextToSize(text, maxLineWidth);
    
    doc.setFontSize(11);
    doc.text(lines, margins, margins);
    
    doc.save('cover_letter.pdf');
}
