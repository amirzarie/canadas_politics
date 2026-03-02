from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3-flash-preview"
    embedding_model: str = "gemini-embedding-001"
    chroma_persist_dir: str = str(Path(__file__).parent / "data" / "chroma_db")
    chroma_collection: str = "canada_laws"

    ourcommons_base: str = "https://www.ourcommons.ca"
    openparliament_base: str = "https://api.openparliament.ca"
    gazette_rss: str = "https://www.gazette.gc.ca/rss/p1-eng.xml"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
