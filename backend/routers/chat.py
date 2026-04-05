from fastapi import APIRouter
from pydantic import BaseModel
import os
import google.generativeai as genai

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    results: list

@router.post("/chat")
def chat_endpoint(request: ChatRequest):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel("gemini-2.5-pro")
    
    # format results limit to 10
    top_results = request.results[:10]
    unique_subreddits = list(set([str(r.get('subreddit', 'Unknown')) for r in top_results]))
    subreddits_str = ", ".join(unique_subreddits)
    
    docs_lines = []
    for r in top_results:
        sub = r.get('subreddit', 'Unknown')
        title = str(r.get('title', '')).strip()
        selftext = str(r.get('selftext', '')).strip()
        
        # limit selftext to 150 words
        words = selftext.split()
        if len(words) > 150:
            selftext = " ".join(words[:150]) + "..."
            
        docs_lines.append(f"[r/{sub}] {title}: {selftext}")
        
    docs = "\n".join(docs_lines)
    
    prompt = f"""system: You are an investigative journalist analyzing Reddit political discourse. Be specific and analytical. Never use bullet points in your response. Write 3 cohesive paragraphs.
    
user: Here are {len(docs_lines)} Reddit posts matching the query '{request.query}' across subreddits: {subreddits_str}.

Posts:
{docs}

Analyze: (1) How does each ideological community frame this topic differently? (2) What specific language or framing choices reveal their worldview? (3) What does the pattern of who is posting — and who isn't — tell us about this topic's salience across the political spectrum?

After your analysis, suggest 3 follow-up queries formatted exactly as:
FOLLOW_UP_1: <query>
FOLLOW_UP_2: <query>
FOLLOW_UP_3: <query>"""
    
    try:
        response = model.generate_content(prompt)
        text = response.text
        
        suggested_queries = []
        summary_lines = []
        for line in text.split('\n'):
            line_str = line.strip()
            if line_str.startswith("FOLLOW_UP_"):
                parts = line_str.split(":", 1)
                if len(parts) > 1:
                    suggested_queries.append(parts[1].strip().replace("<", "").replace(">", "").strip())
            else:
                summary_lines.append(line)
        
        # In case the model ignored formatting to some extent
        summary = "\n".join(summary_lines).strip()
        
        return {"summary": summary, "suggested_queries": suggested_queries}
    except Exception as e:
        return {"summary": f"Failed to generate analysis: {str(e)}", "suggested_queries": []}
