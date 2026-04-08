from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- Token / Auth schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    household_id: Optional[int]
    class Config:
        from_attributes = True

# --- Account schemas ---
class AccountBase(BaseModel):
    name: str
    country: str
    currency: str
    initial_balance: float

class AccountCreate(AccountBase):
    pass

class Account(AccountBase):
    id: int
    user_id: int
    class Config:
        from_attributes = True

# --- Income schemas ---
class IncomeBase(BaseModel):
    source: str
    amount: float
    currency: str
    frequency: str = "monthly"
    date: Optional[datetime] = None

class IncomeCreate(IncomeBase):
    pass

class Income(IncomeBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# --- Expense schemas ---
class ExpenseBase(BaseModel):
    category: str
    amount: float
    currency: str
    frequency: str = "monthly"
    date: Optional[datetime] = None

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    id: int
    user_id: int
    class Config:
        from_attributes = True

# --- Goal schemas ---
class GoalBase(BaseModel):
    name: str
    target_amount: float
    currency: str
    target_date: datetime

class GoalCreate(GoalBase):
    pass

class Goal(GoalBase):
    id: int
    user_id: Optional[int]
    household_id: Optional[int]
    created_at: datetime
    class Config:
        from_attributes = True
