import os
from dotenv import load_dotenv
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

    db.init_app(app)
    jwt = JWTManager(app)

    # Robust CORS setup: allow local frontend and deployed frontend
    cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:8080,http://localhost:8081').split(',')
    CORS(app, origins=cors_origins, supports_credentials=True)

    # Test route to verify backend and CORS
    @app.route('/api/ping')
    def ping():
        return {"message": "pong"}, 200

    # MOVE THIS IMPORT HERE TO AVOID CIRCULAR IMPORT
    from routes.auth import auth_bp
    from routes.papers import paper_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(paper_bp, url_prefix='/api')

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
