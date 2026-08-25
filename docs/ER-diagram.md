erDiagram

    USERS ||--o{ FOLDERS : owns
    USERS ||--o{ FILES : owns
    FOLDERS ||--o{ FILES : contains
    FOLDERS ||--o{ FOLDERS : contains

    FILES ||--o{ SHARES : has
    USERS ||--o{ SHARES : receives

    FILES ||--o{ LINK_SHARES : has

    USERS ||--o{ STARS : creates
    FILES ||--o{ STARS : receives

    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        datetime created_at
        datetime updated_at
    }

    FOLDERS {
        int id PK
        string name
        int owner_id FK
        int parent_id FK
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    FILES {
        int id PK
        string name
        string original_name
        bigint size
        string mime_type
        string storage_path
        int owner_id FK
        int folder_id FK
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    SHARES {
        int id PK
        int file_id FK
        int shared_with_user_id FK
        string role
        datetime created_at
    }

    LINK_SHARES {
        int id PK
        int file_id FK
        string token UK
        datetime expires_at
        string password_hash
        datetime created_at
    }

    STARS {
        int id PK
        int user_id FK
        int file_id FK
        datetime created_at
    }