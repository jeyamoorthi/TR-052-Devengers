# SmartAgri+ Architecture Diagram

```mermaid
graph TB
    %% User Interface Layer
    subgraph "Frontend (React + Vite)"
        A[App.tsx] --> B[Dashboard]
        B --> C[WeatherCard]
        B --> D[MarketView]
        B --> E[DailyPlanner]
        B --> F[VoiceAssistant]
        B --> G[DiseaseDetector]
        B --> H[SoilHealth]
        B --> I[YieldCalculator]
        B --> J[SchemesAdvisor]
        B --> K[IncomeDashboard]
        B --> L[CarbonDashboard]
        B --> M[AQIMonitor]
        B --> N[SustainabilityScore]
        B --> O[VorkWorkflow]
    end

    %% Service Layer
    subgraph "Services Layer"
        P[weatherService] --> Q[OpenWeatherMap API]
        R[geminiService] --> S[Google Gemini AI]
        T[aqiService] --> U[UrbanLive AQI Feed]
        V[vorkService] --> W[VorkAI FastAPI]
        X[firebaseService] --> Y[Firebase Auth]
        Z[voiceService] --> AA[Web Speech API]
        BB[marketService] --> CC[Market Price APIs]
        DD[soilService] --> EE[SoilGrids API]
        FF[cropService] --> GG[Crop Knowledge Base]
        HH[advisoryService] --> II[Rule Engine]
        JJ[workflowEngine] --> KK[AI Workflows]
    end

    %% Data Layer
    subgraph "Data Storage"
        LL[localStorage - Tasks]
        MM[localStorage - Preferences]
        NN[Firebase Firestore - User Data]
        OO[External APIs - Real-time Data]
    end

    %% External Integrations
    subgraph "External Services"
        PP[Google Gemini AI]
        QQ[OpenWeatherMap]
        RR[UrbanLive AQI]
        SS[VorkAI FastAPI]
        TT[SoilGrids]
        UU[Market APIs]
        VV[Firebase]
    end

    %% Connections
    A --> P
    A --> R
    A --> T
    A --> V
    A --> X
    A --> Z
    A --> DD
    A --> FF
    A --> HH
    A --> JJ

    P --> LL
    R --> S
    T --> U
    V --> Y
    X --> AA
    Z --> BB
    DD --> EE
    FF --> GG
    HH --> II
    JJ --> KK

    S --> PP
    Q --> QQ
    U --> RR
    W --> SS
    EE --> TT
    BB --> UU
    Y --> VV

    LL --> NN
    MM --> NN
    OO --> NN
```

# Data Flow Architecture

```mermaid
flowchart LR
    subgraph "User Interaction"
        A[User Input] --> B[Voice Commands]
        A --> C[Touch Interface]
        A --> D[Camera Upload]
    end

    subgraph "Processing Layer"
        B --> E[Intent Recognition]
        C --> F[UI Event Handler]
        D --> G[Image Analysis]
        
        E --> H[Workflow Engine]
        F --> H
        G --> H
        
        H --> I[Service Orchestration]
    end

    subgraph "Service Integration"
        I --> J[Weather Service]
        I --> K[AI Advisory]
        I --> L[Market Data]
        I --> M[Soil Analysis]
        I --> N[AQI Monitoring]
    end

    subgraph "Data Persistence"
        J --> O[Local Cache]
        K --> P[AI Response Cache]
        L --> Q[Market Cache]
        M --> R[Soil Data Cache]
        N --> S[AQI History]
        
        O --> T[localStorage]
        P --> T
        Q --> T
        R --> T
        S --> T
    end

    subgraph "Response Generation"
        T --> U[UI Updates]
        T --> V[Voice Response]
        T --> W[Notifications]
    end

    U --> X[Dashboard Display]
    V --> Y[Audio Feedback]
    W --> Z[Alert System]
```

# Component Interaction Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as App.tsx
    participant D as Dashboard
    participant VS as voiceService
    participant GS as geminiService
    participant WS as weatherService
    participant FS as firebaseService
    
    U->>A: Launch App
    A->>FS: Check Auth
    FS-->>A: User Profile
    A->>D: Load Dashboard
    
    U->>D: Voice Command
    D->>VS: Process Speech
    VS->>GS: Get AI Response
    GS-->>VS: Advisory Text
    VS->>U: Speak Response
    
    D->>WS: Get Weather Data
    WS-->>D: Weather Info
    D->>U: Display Weather
    
    U->>D: Update Profile
    D->>FS: Save User Data
    FS-->>D: Confirmation
    D->>U: Success Message
```
