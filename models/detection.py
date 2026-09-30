from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Detection(db.Model):
    __tablename__ = "detections"

    id = db.Column(db.Integer, primary_key=True)
    animal_name = db.Column(db.String(100), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    image_name = db.Column(db.String(255), nullable=False)
    location = db.Column(db.String(100))
    detected_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Detection {self.animal_name}>"