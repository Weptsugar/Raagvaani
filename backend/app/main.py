from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.engine import create_db
from app.routes.upload import router as upload_router
from app.routes.chat import router as chat_router
from app.routes.sessions import router as sessions_router
from app.routes.files import router as files_router
from app.core.redis_client import init_redis, close_redis

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    create_db()
    await init_redis()
    yield
    # Shutdown actions
    await close_redis()

app = FastAPI(
    title='RagVaani API',
    description='Bilingual Voice + Text RAG System — English & Hindi',
    version='2.0.0',
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000', 'http://localhost:3001'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(upload_router)
app.include_router(chat_router)
app.include_router(sessions_router)
app.include_router(files_router)


@app.get('/')
def health():
    return {'status': 'ok', 'service': 'RagVaani 2.0', 'version': '2.0.0'}