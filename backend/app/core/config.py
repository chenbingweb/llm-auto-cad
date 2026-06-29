from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost:3306/text_to_3d"
    MINIMAX_API_KEY: str
    MINIMAX_API_URL: str = "https://api.minimaxi.com/v1/responses"
    MINIMAX_MODEL: str = "MiniMax-Text-01"

    class Config:
        env_file = ".env"


settings = Settings()