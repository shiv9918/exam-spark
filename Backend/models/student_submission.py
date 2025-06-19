# models/student_submission.py
from db import db
from datetime import datetime

class StudentSubmission(db.Model):
    __tablename__ = 'student_submission'
    id = db.Column(db.Integer, primary_key=True)
    question_paper_id = db.Column(db.Integer, db.ForeignKey('question_paper.id'))
    student_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    student_name = db.Column(db.String(100))
    answers = db.Column(db.Text)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    evaluated = db.Column(db.Boolean, default=False)
    evaluation = db.Column(db.JSON, nullable=True)
