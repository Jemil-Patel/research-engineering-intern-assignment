from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any
import os
import google.generativeai as genai

router = APIRouter()

class SummaryRequest(BaseModel):
    timeseries: List[Dict[str, Any]]

class SummaryResponse(BaseModel):
    summary: str

@router.post("/summary", response_model=SummaryResponse)
def generate_summary(req: SummaryRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        return {"summary": "Gemini API key is not configured. Please set GEMINI_API_KEY in the environment variables."}

    if not req.timeseries:
        return {"summary": "No data available to summarize."}
        
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-pro")
        
        system_prompt = "You are an investigative journalist analyzing data for SimPPL, a nonprofit focused on information integrity. You explain complex data trends to non-technical readers."
        
        user_prompt = f"""
        Analyze the following timeseries data representing Reddit posts across different subreddits.
        Provide a 2-3 sentence plain-language summary of the trends, emphasizing how different ideological subreddits discuss events differently based on the volume of posts.
        Keep it concise, engaging, and accessible to non-technical readers.
        
        Data:
        {req.timeseries[:50]} # Cap it to avoid context limits if too large
        """
        
        response = model.generate_content(
            contents=[
                {"role": "user", "parts": [system_prompt, user_prompt]}
            ]
        )
        
        return {"summary": response.text.strip()}
    except Exception as e:
        print(f"Error generating summary: {e}")
        return {"summary": "Failed to dynamically generate summary due to an error."}
