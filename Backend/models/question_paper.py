# models/question_paper.py
from db import db
from datetime import datetime

class QuestionPaper(db.Model):
    __tablename__ = 'question_paper'
    id = db.Column(db.Integer, primary_key=True)
    subject = db.Column(db.String(100))
    class_name = db.Column(db.String(20))  # 'class' is a reserved keyword
    total_marks = db.Column(db.Integer)
    difficulty = db.Column(db.String(20))
    board = db.Column(db.String(50))
    content = db.Column(db.Text)
    # The 'chapters' column is the source of the error and is temporarily disabled.
    # chapters = db.Column(db.Text, nullable=True) 
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
