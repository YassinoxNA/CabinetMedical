# Backend — Cabinet Dentaire

Socle de l’étape 1 : Spring Boot 3.5, Java 21, PostgreSQL, Flyway, JWT,
utilisateurs, rôles et journal d’activité.

## Prérequis

- JDK 21
- Maven 3.9+
- PostgreSQL 16+ installé localement sur l’ordinateur du cabinet

## Configuration locale

Le fichier `.env` se trouve à la racine du projet. Il contient les paramètres
locaux de PostgreSQL, le port du serveur et un secret JWT généré aléatoirement.
Il est ignoré par Git et ne doit jamais être copié dans un dépôt public.

`application.properties` charge automatiquement `.env`, que le backend soit
lancé depuis la racine du projet ou depuis le dossier `backend`.

## Préparation de PostgreSQL local

Installer PostgreSQL directement sur Windows, puis créer la base et
l’utilisateur applicatif :

```sql
CREATE USER cabinet_app WITH PASSWORD 'VOTRE_MOT_DE_PASSE_LOCAL';
CREATE DATABASE cabinet_dentaire OWNER cabinet_app;
```

Le mot de passe choisi pour l’utilisateur PostgreSQL doit correspondre à
`POSTGRES_PASSWORD` et `DB_PASSWORD` dans `.env`. Lancer ensuite :

```powershell
cd backend
mvn spring-boot:run
```

Le backend écoute uniquement sur `127.0.0.1:8080`.

Cette configuration est destinée à un seul cabinet et ne nécessite ni Docker,
ni service Cloud, ni connexion Internet.

## Première installation

Vérifier si l’installation initiale est nécessaire :

```http
GET /api/v1/system/setup-status
```

Créer les comptes initiaux :

```http
POST /api/v1/system/initial-setup
```

La réponse affiche une seule fois les mots de passe temporaires des comptes
`docteur` et `assistante`. Chaque utilisateur doit les changer à sa première
connexion.

## Routes disponibles

| Méthode | Route | Accès |
|---|---|---|
| GET | `/api/v1/system/setup-status` | Public local |
| POST | `/api/v1/system/initial-setup` | Public, une seule fois |
| POST | `/api/v1/auth/login` | Public |
| POST | `/api/v1/auth/refresh` | Public |
| POST | `/api/v1/auth/logout` | Authentifié |
| GET | `/api/v1/auth/me` | Authentifié |
| POST | `/api/v1/auth/change-password` | Authentifié |
| GET | `/api/v1/users` | Docteur |
| POST | `/api/v1/users` | Docteur |
| POST | `/api/v1/users/{id}/block` | Docteur |
| POST | `/api/v1/users/{id}/activate` | Docteur |
| POST | `/api/v1/users/{id}/reset-password` | Docteur |
| GET | `/api/v1/audit-logs` | Docteur |

Swagger est disponible en développement sur
`http://localhost:8080/swagger-ui.html`.

## Sécurité

- Les mots de passe sont encodés par `DelegatingPasswordEncoder` (BCrypt).
- Les refresh tokens sont aléatoires et seuls leurs hash SHA-256 sont stockés.
- Le token d’accès expire après 15 minutes.
- Le refresh token est renouvelé par rotation et expire après 7 jours.
- Un compte bloqué ne peut plus se connecter ni renouveler sa session.
- Un mot de passe temporaire limite l’accès aux routes de changement de mot de
  passe, déconnexion et profil.
- Le journal `audit_logs` est append-only, protégé par un trigger PostgreSQL.
- Le service est lié à l’interface loopback par défaut pour rester local.
