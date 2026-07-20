"""
middleware.py
-------------
Rate limiting middleware using slowapi.
Protects endpoints against brute-force attacks.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
