"""The shipped v1 editor dictionary, shared with the UI; no search or classification."""

import hashlib
import json
from typing import Literal

from pydantic import Field, field_validator

from app.config import ROOT
from app.dto import DTO

_raw = (ROOT / 'frontend/lib/monitoring-dictionary-v1.json').read_bytes()
DICTIONARY = json.loads(_raw)
DICTIONARY_SHA256 = hashlib.sha256(_raw).hexdigest()


class QueryParameters(DTO):
    dictionary_version: Literal['1.0'] = '1.0'
    city: str = Field(min_length=1, max_length=100)
    language: Literal['ru', 'kk']
    topic: str = Field(min_length=1, max_length=40)
    project: str = Field(default='', max_length=100)

    @field_validator('city')
    @classmethod
    def known_city(cls, value):
        if value not in DICTIONARY['city_aliases']:
            raise ValueError('Выберите вариант города из словаря1.0')
        return value

    @field_validator('topic')
    @classmethod
    def known_topic(cls, value):
        if value not in ['all', *(item['id'] for item in DICTIONARY['topics'])]:
            raise ValueError('Выберите тему из словаря1.0')
        return value

    @field_validator('project')
    @classmethod
    def normalize_project(cls, value):
        if any(ord(char) < 32 and char not in '\t\r\n' for char in value):
            raise ValueError('Название содержит управляющие символы')
        return ' '.join(value.split())


def compile_queries(parameters: QueryParameters) -> list[str]:
    context = 'ЖК' if parameters.language == 'ru' else 'тұрғын үй кешені'
    phrases = [
        phrase
        for topic in DICTIONARY['topics']
        if parameters.topic in {'all', topic['id']}
        for phrase in topic['phrases'][parameters.language]
    ]
    return list(
        dict.fromkeys(
            ' '.join(part for part in [parameters.city, context, parameters.project, phrase] if part)
            for phrase in phrases
        )
    )
