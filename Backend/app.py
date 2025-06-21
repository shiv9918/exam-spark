import os
from dotenv import load_dotenv
from datetime import timedelta
load_dotenv()

from flask import Flask
from db import db
from flask_jwt_extended import JWTManager
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///smarteve.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)  # 24 hour expiration

    db.init_app(app)
    jwt = JWTManager(app)

    # Robust CORS setup: use a hardcoded list to avoid environment issues
    cors_origins = [
        "http://localhost:8080",
        "http://localhost:8081",
        "https://exam-spark-t9v2.vercel.app", # Old Vercel domain
        "https://exam-sparks.vercel.app"    # New Vercel domain
    ]
    
    CORS(app, origins=cors_origins, supports_credentials=True)

    # MOVE THIS IMPORT HERE TO AVOID CIRCULAR IMPORT
    from routes.auth import auth_bp
    from routes.papers import paper_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(paper_bp, url_prefix='/api')

    with app.app_context():
        db.create_all()
        
    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
