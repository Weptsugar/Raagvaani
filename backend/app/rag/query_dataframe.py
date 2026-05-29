import os
import pandas as pd
import json
import logging
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def load_dataframe(file_path: str, file_type: str) -> pd.DataFrame:
    ext = file_type.lower()
    if ext == 'csv':
        return pd.read_csv(file_path)
    elif ext == 'xlsx':
        return pd.read_excel(file_path)
    raise ValueError(f"Unsupported dataframe type: {ext}")

def get_dataframe_summary(df: pd.DataFrame) -> str:
    summary = []
    summary.append(f"Total Rows: {len(df)}")
    summary.append(f"Total Columns: {len(df.columns)}")
    summary.append("Columns and Types:")
    for col in df.columns:
        summary.append(f" - {col} ({df[col].dtype})")
    
    # Missing values
    missing = df.isnull().sum()
    if missing.any():
        summary.append("\nMissing Values:")
        for col, count in missing[missing > 0].items():
            summary.append(f" - {col}: {count}")
            
    return "\n".join(summary)

def execute_pandas_query(query: str, file_path: str, file_type: str, language: str) -> dict:
    df = load_dataframe(file_path, file_type)
    
    # 1. Provide schema to LLM and get Python code
    schema = get_dataframe_summary(df)
    
    prompt = f"""You are a Dataframe Query Assistant.
The user has a pandas DataFrame named `df`.
Schema:
{schema}

User Question: {query}

If the user is simply asking for a summary of the dataset or its columns, return the word "SUMMARY_ONLY" instead of code.
Otherwise, return a SINGLE line of Python code using `df` that evaluates to the answer.
The code must be extremely safe, use no modules other than `pd`, and return a raw value (number, string, list, etc.).
Example for counting rows where stroke is 1: df[df['stroke'] == 1].shape[0]
Example for average age: df['age'].mean()
Example for grouping: df.groupby('gender')['stroke'].sum().to_dict()

Return ONLY the python expression. No markdown, no backticks, no comments.
"""
    response = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0
    )
    code = response.choices[0].message.content.strip()
    
    # Clean markdown if LLM adds it by mistake
    if code.startswith("```"):
        code = code.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    if code.startswith("python"):
        code = code[6:].strip()

    if code == "SUMMARY_ONLY":
        result = schema
    else:
        try:
            # Safely evaluate
            logger.info(f"Executing pandas code: {code}")
            result = eval(code, {"pd": pd}, {"df": df})
            if hasattr(result, 'to_dict'):
                result = result.to_dict()
        except Exception as e:
            logger.error(f"Failed to execute pandas code '{code}': {e}")
            result = f"Error executing computation: {e}"

    # 2. Format result into UI/Voice JSON
    lang_name = 'Hindi' if language == 'hi' else 'English'
    format_prompt = f"""You are RagVaani, an expert bilingual document assistant.
The user asked: {query}
The dataset computation returned: {result}

You MUST respond ONLY in {lang_name}.
Your response MUST be a valid JSON object strictly conforming to this exact schema:
{{
  "ui_markdown": "Your detailed answer formatted in Markdown here...",
  "voice_prose": "Your plain-text natural-flowing spoken version here..."
}}

Rules:
- Give a direct, accurate numerical or text answer based EXACTLY on the computation result.
- ui_markdown should be formatted well. Use markdown for lists or bold text.
- voice_prose should be easily speakable text (no markdown, spell out numbers).
Return ONLY the JSON object, no other text."""

    format_response = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[{"role": "user", "content": format_prompt}],
        response_format={'type': 'json_object'},
        temperature=0.0
    )
    
    raw_content = format_response.choices[0].message.content
    parsed = json.loads(raw_content)
    
    return {
        'ui_markdown': parsed.get('ui_markdown', str(result)),
        'voice_prose': parsed.get('voice_prose', str(result)),
        'route': 'pandas_computation',
        'sources': ['Structured Dataset Computation']
    }
