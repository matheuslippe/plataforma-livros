FROM python:3.11-slim

WORKDIR /code

# Instala as bibliotecas primeiro, avisando o PIP para confiar nos sites oficiais
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade \
    --trusted-host pypi.org \
    --trusted-host pypi.python.org \
    --trusted-host files.pythonhosted.org \
    -r /code/requirements.txt

# Copia o seu código para dentro do container
COPY ./app /code/app