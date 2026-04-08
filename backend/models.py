from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    household_id = Column(Integer, ForeignKey("households.id"), nullable=True)

    household = relationship("Household", back_populates="users")
    accounts = relationship("Account", back_populates="user")
    incomes = relationship("Income", back_populates="user")
    expenses = relationship("Expense", back_populates="user")
    goals = relationship("Goal", back_populates="user")

class Household(Base):
    __tablename__ = "households"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    
    users = relationship("User", back_populates="household")

class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, index=True) # e.g., "HSBC Dubai"
    country = Column(String)
    currency = Column(String) # "AED", "USD", "INR"
    initial_balance = Column(Float, default=0.0)

    user = relationship("User", back_populates="accounts")

class Income(Base):
    __tablename__ = "incomes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    source = Column(String)
    amount = Column(Float)
    currency = Column(String)
    frequency = Column(String, default="monthly")
    date = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="incomes")

class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    category = Column(String)
    amount = Column(Float)
    currency = Column(String)
    frequency = Column(String, default="monthly")
    date = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="expenses")

class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    household_id = Column(Integer, ForeignKey("households.id"), nullable=True)
    name = Column(String)
    target_amount = Column(Float)
    currency = Column(String)
    target_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="goals")
