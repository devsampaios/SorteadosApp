# Guia de Instalação e Configuração - Ubuntu Server 26.04 (AWS)

## 1. Atualizar pacotes do sistema
```bash
apt-get update
apt-get install -y software-properties-common
apt upgrade -y
apt install gnupg2 wget ca-certificates -y
reboot
```

---

## 2. Conexão SSH
```bash
# Conectar ao servidor via SSH
ssh -i "nome_da_chave.pem" nome_do_usuario@nome_do_servidor
ssh -i "chave-padrao.pem" ubuntu@56.125.202.62
```

### Habilitar acesso por usuário e senha
```bash
vi /etc/ssh/sshd_config.d/learning-sftp.conf
```
Adicionar:
```
Match User learning
PasswordAuthentication yes
AuthenticationMethods password keyboard-interactive
```
Salvar e reiniciar:
```bash
systemctl restart ssh
```

---

## 3. Configurar data e hora
```bash
# Listar timezones
timedatectl list-timezones | grep Paulo

# Definir fuso horário
timedatectl set-timezone America/Sao_Paulo
```

---

## 4. Desabilitar atualizações automáticas
```bash
vi /etc/apt/apt.conf.d/20auto-upgrades
```
Definir:
```
APT::Periodic::Update-Package-Lists "0";
APT::Periodic::Unattended-Upgrade "0";
```

---

## 5. Instalar Node.js
```bash
# Instalar Node.js LTS via NodeSource (ajuste a versão conforme necessário)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Validar instalação
node -v
npm -v
```

Opcional — instalar o PM2 para gerenciamento de processos (alternativa/complemento ao systemd):
```bash
npm install -g pm2
```

---

## 6. Instalar cliente do PostgreSQL
```bash
apt install -y postgresql-common
/usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
apt install postgresql-client-17
```

Se precisar do PostgreSQL rodando na máquina

```
apt install postgresql-17
```

### Conectar no banco

Se for banco local

```sql
sudo -u postgres psql
```

Se for banco remoto

```
psql -h <HOST-DO-BANCO> -U <NOME-DE-USUARIO> -d postgres
```

### Criar usuário
```sql
create user userlearning with encrypted password 'SENHA-XYZ'; 
-- Comando para alterar senha se necessário
-- alter user userlearning with password 'SENHA-XYZ';
```

### Criar bases de dados
```sql
create database hml_learning with owner userlearning;
create database hml_learning_log  with owner userlearning;
```

### Criar extensões
```sql
create extension if not exists pg_stat_statements;
create extension if not exists dblink;
```


### Configurar timezone do PostgreSQL
```sql
-- Ver timezones disponíveis
-- select * from pg_timezone_names;

alter database hml_learning set timezone to 'America/Sao_Paulo';
alter database hml_learning_log set timezone to 'America/Sao_Paulo';
select pg_reload_conf();
```
\q para finalizar

---

## 7. Instalar e configurar Nginx
```bash
apt-get install nginx
systemctl start nginx
systemctl status nginx
```

---

## 8. Criar usuário para manutenção
```bash
adduser learning
# Comando para remover case seja necessário recriar
# > deluser --remove-home learning
# Comando para alterar senha ccase seja necessário
```

---

## 9. Criar estrutura de pastas das aplicações
```bash
mkdir -p /opt/app/learning/{setup,api,api-bkp,api-temp,site,arquivos,servico,servico-temp}
chown -R learning /opt/app/learning
chmod +rwX -R /opt/app/learning
```

---

## 10. Criar serviço da API (systemd)

Antes de configurar o serviço, instale as dependências da aplicação dentro da pasta da API:
```bash
cd /opt/app/learning/api
npm ci --omit=dev
```

### Arquivo de serviço
```bash
vi /etc/systemd/system/learning.service
```
Conteúdo:
```
[Unit]
Description=Serviços da API do learning
After=network.target 

[Service]
WorkingDirectory=/opt/app/learning/api
ExecStart=/usr/bin/node /opt/app/learning/api/index.js
Environment=NODE_ENV=production
Environment=PORT=7001
User=learning
SyslogIdentifier=learningApi
Restart=on-failure
RestartSec=20s

[Install]
WantedBy=multi-user.target
```

> Ajuste `index.js` para o arquivo de entrada real da sua aplicação (ex.: `server.js`, `app.js`, `dist/main.js`), e `PORT` para a porta usada pela API.

### Ativar serviço
```bash
systemctl enable learning
systemctl daemon-reload
systemctl start learning
systemctl status learning
```

---

## 11. Configuração do Nginx para publicar o site
```bash
vi /etc/nginx/conf.d/learning.conf
```
Exemplo:
```
server {
    listen 8001 default_server;

    root /opt/app/learning/site;
    index index.html;

    # Cache agressivo só para arquivos estáticos versionados do Vite
    location /assets/ {
       try_files $uri =404;
       add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Se você gerar outros assets (js/css/png/svg/etc) fora de /assets
    location ~* \.(?:js|mjs|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?)$ {
       try_files $uri =404;
       add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location = /status {
       access_log off;                   # opcional, evita poluir os logs
       default_type text/plain;          # define o tipo do retorno
       return 200 "Serviço em execução\n";  # resposta fixa com status 200
    }

    # Fallback para SPA: qualquer rota não-arquivo volta para index.html
       location / {
       try_files $uri $uri/ /index.html;
    }
}

```

### Testar e reiniciar
```bash
nginx -t
systemctl restart nginx
systemctl status nginx
```

---

## 12. Configurar firewall (UFW)
```bash
ufw allow ssh
ufw allow 80
ufw allow 7001
ufw allow 8001
ufw enable
ufw reload
ufw status numbered
```

---

## 13. Permissões sudo sem senha
```bash
vi /etc/sudoers.d/learning
```
Conteúdo:
```
learning ALL=NOPASSWD: /bin/systemctl start learning.service, /bin/systemctl stop learning.service, /bin/systemctl status learning.service, /bin/systemctl restart learning.service
```

## 14. Amazon EFS


**EFS:** `fs-02f19687cd905de82`\
**Ponto de montagem:** `/opt/app/learning/arquivos`

## 1. Instalar dependências


#### Expandir a memória disponível

Se a máquina tiver menos de 4GB de memória será necessário criar um arquivo swap pra aumentar a memória durante a instalação.

```
swapoff /swapfile 2>/dev/null || true
rm -f /swapfile

fallocate -l 8G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

Ao finalizar a instalação rode esses comandos para desativar a swap.

```
swapoff /swapfile
rm -f /swapfile
```

#### Baixar e compilar o amazon-efs-utils

Instalar o dependências

```
apt install -y git
apt install -y binutils
apt install -y build-essential
apt install -y pkg-config
apt install -y libssl-dev
apt install -y cmake
apt install -y golang-go
apt install -y python3
apt install -y python3-botocore
apt install -y nfs-common
apt install -y stunnel4
apt install -y curl
apt -y install cargo
```

``` bash
cd /opt/app
rm -rf efs-utils

git clone https://github.com/aws/efs-utils.git
cd efs-utils

export CARGO_BUILD_JOBS=1
export CMAKE_BUILD_PARALLEL_LEVEL=1

env -u MAKEFLAGS ./build-deb.sh
```

#### Instalar o pacote

``` bash
cd /opt/app/efs-utils/build
apt install -y ./amazon-efs-utils-*_arm64.deb
which mount.efs
```

#### Montar o EFS

``` bash
mount -t efs -o tls fs-02f19687cd905de82:/ /opt/app/learning/arquivos
```

#### Validar a montagem

``` bash
df -h /opt/app/learning/arquivos

mount | grep '/opt/app/learning/arquivos'
```

O resultado deve mostrar o EFS (`127.0.0.1:/` ou
`fs-02f19687cd905de82`).

#### Configurar montagem automática

Adicione ao aqruivo `/etc/fstab`:

```
vi /etc/fstab
```
Adicione:

``` fstab
fs-02f19687cd905de82:/ /opt/app/learning/arquivos efs _netdev,tls,nofail 0 0
```

Teste:

``` bash
mount -a

df -h /opt/app/learning/arquivos
```

#### Observações

-   Este procedimento é específico para **Ubuntu 20.26 ARM64**.
-   Caso a montagem falhe, verifique:
    -   Security Groups (porta TCP 2049).
    -   Mount Targets do EFS em todas as AZs utilizadas pelas EC2.
    -   Resolução DNS do EFS.