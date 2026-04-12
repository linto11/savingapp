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
    transfers = relationship("Transfer", back_populates="user")

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
    incomes = relationship("Income", back_populates="account")
    expenses = relationship("Expense", back_populates="account")
    outgoing_transfers = relationship("Transfer", foreign_keys="Transfer.from_account_id", back_populates="from_account")
    incoming_transfers = relationship("Transfer", foreign_keys="Transfer.to_account_id", back_populates="to_account")

class Income(Base):
    __tablename__ = "incomes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    source = Column(String)
    amount = Column(Float)
    currency = Column(String)
    frequency = Column(String, default="monthly")
    date = Column(DateTime, nullable=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)

    user = relationship("User", back_populates="incomes")
    account = relationship("Account", back_populates="incomes")

class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    category = Column(String)
    amount = Column(Float)
    currency = Column(String)
    frequency = Column(String, default="monthly")
    date = Column(DateTime, nullable=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)

    user = relationship("User", back_populates="expenses")
    account = relationship("Account", back_populates="expenses")

class Transfer(Base):
    __tablename__ = "transfers"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    from_account_id = Column(Integer, ForeignKey("accounts.id"))
    to_account_id = Column(Integer, ForeignKey("accounts.id"))
    amount = Column(Float)
    currency = Column(String)
    date = Column(DateTime, nullable=True)
    note = Column(String, nullable=True)

    user = relationship("User", back_populates="transfers")
    from_account = relationship("Account", foreign_keys=[from_account_id], back_populates="outgoing_transfers")
    to_account = relationship("Account", foreign_keys=[to_account_id], back_populates="incoming_transfers")

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
