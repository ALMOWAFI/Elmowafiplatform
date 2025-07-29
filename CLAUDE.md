# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Elmowafiplatform** is an AI-powered family memory management and travel platform designed to intelligently preserve, organize, and share family memories while serving as a comprehensive travel planning and educational assistant. The platform uses advanced AI to process family photos, documents, and experiences, creating an intelligent digital ecosystem that acts as both a family memory keeper and a personalized tour guide.

### Core Vision
- **Intelligent Memory Management**: AI analyzes family photos, documents, and experiences to create organized timelines and smart memory suggestions
- **Family-Aware AI Assistant**: A chatbot that serves as both family friend and personalized tour guide with deep understanding of family history and preferences  
- **Interactive Travel Planning**: 3D world visualization with collaborative family travel planning and budget management
- **AI Game Master System**: Intelligent referee for family activities like Mafia, Among Us, and travel challenges with role assignment, cheat detection, and rule enforcement
- **Cultural Heritage Preservation**: Bilingual (Arabic/English) support for preserving family cultural heritage
- **Educational AI Tools**: Advanced AI for analyzing educational content, providing personalized feedback, and supporting family learning

## Repository Structure

The platform consists of interconnected components that work together to create an intelligent family memory and travel ecosystem:

### Core Family Platform Components
- **elmowafy-travels-oasis/**: Main React/TypeScript application with 3D world map, AI travel assistant, family collaboration tools, and AI game master system
- **hack2/**: AI-powered content analyzer (photos, documents, educational materials) with OCR, Azure AI, and ML capabilities  
- **kingraph/**: Interactive family tree visualization with travel history integration and relationship mapping
- **envelope-budgeting-test/**: Family budget management and collaborative financial planning tools

### AI & Memory Processing Engine
- **hack2/math_analyzer/**: Advanced AI for image processing, OCR, document analysis, and memory categorization
- **hack2/paper-pal-prodigy-prime/**: Enhanced UI for AI feedback and educational content analysis
- **AI Integration**: Azure Cognitive Services, OpenCV, PyTorch for intelligent memory processing

### Educational Support Systems  
- **canvas-lms/**: Full-featured learning management system for family education tracking
- **edx-platform/**: Additional educational platform with Django backend
- **moodle/**: Supplementary educational tools and content management
- **jupyter-book/**: Documentation and knowledge sharing system

### Family Gaming & Activities System
- **godot-game-template/**: 2D/3D game development framework with scene management and state transitions for family gaming
- **react-native-game-engine/**: Component-Entity-System (CES) based mobile game engine for touch-based family games and real-time interactions
- **Travel Games Integration**: Built-in Mafia game manager, Among Us location-based variant, traditional Middle Eastern card games, and AI-powered challenges
- **frontend/**: Additional frontend tools including PeerTube for family video sharing and gaming session recordings

## Development Commands

### Main Family Platform (elmowafy-travels-oasis/)
```bash
# Install dependencies
npm install

# Development server with 3D map, AI features, and game master
npm run dev        # Vite dev server with hot reload (includes gaming system)
npm run build      # Production build for deployment
npm run preview    # Preview production build

# Code quality
npm run lint       # ESLint + TypeScript checking

# Gaming components are accessible at:
# /travel-games - Mafia, Among Us, and card games
# /challenges - Travel challenges and family activities
# /game-master - AI referee interface
```

### AI Memory Processing Engine (hack2/)
```bash
# Install Python AI dependencies
pip install -r requirements.txt

# Start AI processing servers
python app.py                    # Basic Flask server for image analysis
python enhanced_app.py           # Enhanced AI server with advanced features
python mvp_server.py            # MVP server for testing
python start_integrated_app.py   # Full integrated AI platform

# AI model training and testing
python test_enhanced_math_feedback.py  # Test AI feedback systems
python unified_math_test.py            # Comprehensive AI testing
python analyze_math.py                 # Analyze family educational content

# Paper processing UI
cd paper-pal-prodigy-prime/
npm install
npm run dev                      # React UI for AI feedback
```

### Family Tree & Relationships (kingraph/)
```bash
# Install dependencies  
npm install

# Generate family trees
./bin/kingraph input.yml         # Generate from YAML family data
npm test                         # Test family tree generation

# Examples available in examples/ directory
```

### Family Budget Management (envelope-budgeting-test/)
```bash
# Install Wasp dependencies
npm install

# Development server
npm run dev        # Wasp development with database

# Build for production
npm run build
```

### Educational Platforms (for family learning tracking)

#### Canvas LMS (canvas-lms/)
```bash
yarn install
yarn serve         # Educational platform for family
yarn build         # Build educational assets
yarn test          # Test educational features
```

#### Open edX Platform (edx-platform/)  
```bash
pip install -r requirements/edx/dev.txt
npm install
./manage.py lms runserver 18000    # Learning management
./manage.py cms runserver 18010    # Content management
```

#### Moodle (moodle/)
```bash
npm install
grunt              # Build educational assets
grunt watch        # Watch mode for development
```

### Documentation & Knowledge Base (jupyter-book/)
```bash
pip install -e .                # Install in development mode
jb build docs/                  # Build family documentation
jb serve docs/_build/html/       # Serve family knowledge base
```

### Family Gaming Development

#### Godot Game Engine (godot-game-template/)
```bash
# Open Godot editor
godot project.godot              # Open family game project

# Export builds for family gaming
./release.sh                     # Build for multiple platforms
# Builds available in builds/ directory for Windows, macOS, Linux, Android
```

#### React Native Games (react-native-game-engine/)
```bash
# Install mobile game dependencies
npm install

# Test game engine components
npm test                         # Test CES system and game loops
npm run example                  # Run example family games

# For mobile development, ensure React Native environment is set up
```

## Architecture Notes

### Intelligent Family Memory System
The platform uses a multi-layered architecture designed around family-centric AI and memory management:

#### **AI Memory Processing Pipeline**
1. **Input Layer**: Family photos, documents, travel memories, educational content
2. **AI Analysis**: Azure Cognitive Services + OpenCV + PyTorch for content understanding
3. **Relationship Mapping**: Connect memories to family members using facial recognition and context
4. **Smart Organization**: Timeline creation, event correlation, memory suggestions
5. **Presentation Layer**: 3D visualization, interactive timelines, intelligent suggestions

#### **Family-Aware Data Architecture**
- **Central Family Graph**: Relationships, travel history, shared experiences stored in interconnected format
- **Memory Nodes**: Each photo/document/experience linked to family members, locations, timeframes
- **AI Context**: System learns family preferences, travel patterns, educational needs
- **Cultural Data**: Bilingual content (Arabic/English) with cultural context preservation

### Core Technology Stack

#### **Main Family Platform (elmowafy-travels-oasis/)**
- **Frontend**: React 18 + TypeScript + Vite for fast development
- **3D Visualization**: Three.js for interactive world map and memory exploration  
- **UI Framework**: Tailwind CSS + shadcn/ui components for consistent family interface
- **State Management**: TanStack Query for server state, Context for family data
- **AI Integration**: REST APIs to hack2/ AI processing engine

#### **AI Processing Engine (hack2/)**
- **Backend**: Python Flask + FastAPI for AI services
- **Computer Vision**: OpenCV for image processing and family photo analysis
- **OCR Engine**: Tesseract + Azure OCR for document digitization
- **Machine Learning**: PyTorch for custom family memory models
- **Cloud AI**: Azure Cognitive Services for advanced content understanding
- **Data Storage**: JSON structures, file system, Azure blob storage

#### **Family Tree System (kingraph/)**
- **Data Format**: YAML-based family structure (human-readable and editable)
- **Visualization**: Graphviz for complex family relationship rendering
- **Output**: SVG/PNG/DOT formats for web and print use
- **Integration**: Travel history and memory connections per family member

### Data Flow Architecture

```
Family Input (Photos/Travel/Education)
    ↓
AI Analysis Engine (hack2/)
    ↓  
Memory Classification & Relationship Mapping
    ↓
Central Family Knowledge Graph
    ↓
Smart Retrieval & Suggestion Engine
    ↓
3D Visualization & Family Interface (elmowafy-travels-oasis/)
```

### AI-Powered Features
- **Smart Memory Suggestions**: "On this day" style memory surfacing based on family history
- **Travel Recommendations**: AI tour guide using family preferences and past experiences  
- **Educational Analysis**: Intelligent feedback on family members' learning progress
- **Budget Intelligence**: AI-powered family expense optimization and travel planning
- **Cultural Preservation**: Automatic Arabic-English translation and cultural context maintenance
- **AI Game Master**: Intelligent referee system for family activities and games

## Family Gaming & Activities System

### AI Game Master Architecture
The platform includes a comprehensive **AI-powered game master system** that serves as an intelligent referee for family activities:

#### **Game Types Supported**
- **Mafia Game**: Complete role management (godfather, assassin, detective, doctor, bodyguard, jester, survivor) with night/day phases and voting mechanics
- **Among Us Variant**: Location-based real-world version with GPS tasks, emergency meetings, sabotage mechanics, and impostor detection
- **Traditional Card Games**: Digital versions of Middle Eastern games (Advanced Baloot, Professional Concan) with cultural authenticity
- **Travel Challenges**: GPS-verified treasure hunts, photo challenges, quiz competitions, and team-based activities
- **Custom Activities**: Flexible framework for creating family-specific games and challenges

#### **AI Referee Capabilities**
- **Automated Role Assignment**: Smart distribution based on player preferences, game balance, and family dynamics
- **Real-time Rule Enforcement**: AI monitoring for rule compliance, fair play, and game flow management
- **Intelligent Cheat Detection**: 
  - GPS verification for location-based challenges
  - Photo evidence validation with family member recognition
  - Timestamp analysis for fair play monitoring
  - Team coordination verification
- **Dynamic Game Management**: 
  - Round progression with voice/text announcements
  - Adaptive difficulty based on player engagement
  - Cultural sensitivity in game narratives
  - Multi-language support (Arabic/English)

#### **Gaming Technology Stack**
- **Game State Management**: Persistent progress tracking across sessions with real-time synchronization
- **Component-Entity-System**: Modular game architecture for complex family interactions
- **Location Integration**: GPS-based mechanics with QR code scanning and photo verification
- **Multi-Platform Support**: Web, mobile, and desktop gaming experiences
- **Real-time Communication**: Live updates, team coordination, and family-wide notifications

#### **Family-Centric Features**
- **Multi-Generational Support**: Games designed for various age groups within the family
- **Cultural Integration**: Traditional Middle Eastern games with modern digital enhancements
- **Achievement Systems**: Badge collection, level progression, and family leaderboards
- **Memory Integration**: Game achievements connect to family travel photos and experiences
- **Collaborative Decision Making**: Family council integration for activity planning and rule modifications

## Testing Strategy

### Family Platform Testing (elmowafy-travels-oasis/)
- **Component Testing**: Jest + Testing Library for family UI components
- **3D Visualization**: Custom tests for Three.js family world map
- **AI Integration**: Mock tests for family memory processing APIs
- **Cross-Cultural**: Tests for Arabic/English bilingual functionality
- **Gaming System Tests**: 
  - Mafia game role assignment and state management
  - AI referee decision-making accuracy
  - Cheat detection system validation
  - Multi-player coordination and synchronization

### AI Memory Processing (hack2/)
- **Image Analysis**: Test suites for family photo processing accuracy
- **OCR Testing**: Document digitization accuracy tests
- **ML Model Validation**: Family memory classification accuracy
- **Integration Tests**: End-to-end family memory workflow testing

### Family Tree System (kingraph/)
- **Generation Tests**: Validate family tree structure and relationships
- **Visualization Tests**: Ensure proper SVG/PNG family tree output
- **Data Integrity**: YAML family data validation

## Key Family Platform Dependencies

### Main Platform (elmowafy-travels-oasis/)
- **3D Visualization**: @react-three/fiber, @react-three/drei for family world map
- **UI Components**: @radix-ui/* components for accessible family interface  
- **Form Management**: react-hook-form + @hookform/resolvers for family data entry
- **Animations**: framer-motion for smooth family interface interactions
- **Routing**: react-router-dom for family section navigation

### AI Processing Engine (hack2/)
- **AI/ML**: transformers, torch, scikit-learn for family memory intelligence
- **Computer Vision**: opencv-python, pillow for family photo analysis
- **Cloud AI**: azure-cognitiveservices-vision for advanced family content understanding
- **OCR**: tesseract-ocr for family document digitization
- **Web Framework**: flask, requests for AI service APIs

### Family Tree & Relationships (kingraph/)
- **Visualization**: viz.js (Graphviz) for family tree rendering
- **Data Processing**: js-yaml for family structure data
- **Image Generation**: svg2png for family tree exports

### Educational Components
- **Canvas**: @instructure/ui-* design system for consistent family learning interface
- **edX**: @edx/paragon components for family educational features
- **Documentation**: jupyter-book, sphinx for family knowledge preservation

## Family-Specific Build Systems

- **Main Platform**: Vite + SWC for fast family interface development with hot reload
- **AI Engine**: Python setuptools with requirements.txt for AI model dependencies
- **Family Trees**: Node.js with Graphviz system dependency for tree generation
- **Educational Platforms**: Various (Rspack for Canvas, Webpack for edX, Grunt for Moodle)

## Development Environment Setup

### For Family Platform Development

1. **Start with Main Platform** (elmowafy-travels-oasis/):
   ```bash
   cd elmowafy-travels-oasis/
   npm install
   npm run dev    # Start 3D family interface
   ```

2. **Set up AI Memory Engine** (hack2/):
   ```bash
   cd hack2/
   pip install -r requirements.txt
   # Configure Azure AI credentials in .env
   python enhanced_app.py    # Start AI processing server
   ```

3. **Family Tree System** (kingraph/):
   ```bash
   cd kingraph/
   npm install
   # Edit family data in examples/ or create your own YAML
   ```

4. **Optional Educational Platforms**: Set up Canvas/edX/Moodle if needed for family learning tracking

### Package Manager Guide
- **Main Platform**: npm (Vite-based)
- **AI Engine**: pip (Python-based) 
- **Family Trees**: npm (Node.js tools)
- **Canvas**: yarn (workspace management)
- **edX**: npm + pip (dual language)

## Family Platform Workflow

### Typical Development Flow
1. **Family Data Entry**: Use main platform to input family information
2. **Memory Processing**: AI engine analyzes photos and documents  
3. **Relationship Mapping**: Family tree system visualizes connections
4. **Travel Planning**: Collaborative features for family trips
5. **Memory Sharing**: Timeline and smart suggestions display

### Common Family-Focused Tasks
- Adding new family members to tree structure
- Processing family photo batches through AI engine
- Creating travel itineraries with budget collaboration
- Setting up educational tracking for family learning
- Configuring bilingual (Arabic/English) content
- **Gaming Activities**:
  - Setting up Mafia games with AI referee
  - Creating location-based challenges during family trips
  - Managing team-based activities and competitions
  - Configuring game rules and difficulty levels for different ages
  - Monitoring fair play and resolving game disputes

## Important Notes

- **Cultural Sensitivity**: Platform supports Arabic names, dates, and cultural context
- **Privacy First**: Family data should be kept private and secure
- **AI Processing**: Requires Azure AI credentials for full functionality
- **3D Performance**: Three.js features need modern browsers and decent GPU
- **Memory Requirements**: AI processing can be memory-intensive with large photo batches
- **Bilingual Support**: Ensure proper Arabic font rendering in development environment

## Current Development Status & Roadmap

### What We Have Achieved ✅

#### **Fully Functional Components (Production Ready)**

**1. Main Family Platform UI (elmowafy-travels-oasis/)** 
- ✅ Modern React/TypeScript application with Vite
- ✅ 3D Interactive World Map with Three.js
- ✅ Complete family tree visualization with Arabic/English support
- ✅ Professional UI components with shadcn/ui
- ✅ Responsive design and routing system
- ✅ Basic chatbot interface

**2. AI Memory Processing Engine (hack2/)**
- ✅ Advanced OCR and document analysis system
- ✅ OpenCV computer vision for image processing
- ✅ Azure AI services integration
- ✅ Educational content analysis with intelligent feedback
- ✅ Multiple AI teaching personas and styles
- ✅ Math problem error detection and grading

**3. Family Tree System (kingraph/)**
- ✅ YAML-based family data structure
- ✅ Professional family tree rendering with Graphviz
- ✅ Multiple export formats (SVG, PNG, DOT)
- ✅ Working examples and templates

**4. Budget Management (envelope-budgeting-test/)**
- ✅ Complete envelope budgeting system
- ✅ Multi-user collaboration with role-based access
- ✅ PostgreSQL database with transaction management
- ✅ Dashboard analytics and spending visualizations

**5. Gaming Infrastructure**
- ✅ Godot game engine template with professional setup
- ✅ React Native game engine with CES architecture
- ✅ Team management and point tracking systems

### Work In Progress 🟡

#### **Partially Implemented Features**

**1. AI Game Master System**
- ✅ Gaming framework and UI components
- ❌ **Missing**: Actual Mafia game logic and role management
- ❌ **Missing**: AI referee automation and cheat detection
- ❌ **Missing**: Real-time multiplayer synchronization

**2. Memory Management Integration**
- ✅ AI processing capabilities for photos/documents
- ✅ Family member data structures
- ❌ **Missing**: Connection between AI engine and main platform
- ❌ **Missing**: Smart memory suggestions and timeline features

**3. Travel Planning Features**
- ✅ 3D world map with location markers
- ❌ **Missing**: Collaborative trip planning interface
- ❌ **Missing**: AI-powered travel recommendations
- ❌ **Missing**: Budget integration with travel planning

**4. ChatBot Intelligence**
- ✅ Basic conversation interface
- ❌ **Missing**: Integration with family memory system
- ❌ **Missing**: AI-powered travel guide capabilities
- ❌ **Missing**: Personality-driven responses

### Critical Missing Components ❌

#### **Major Features Not Yet Implemented**

**1. System Integration**
- No unified API connecting React frontend to Python AI backend
- No central database linking all family data
- No real-time communication between components

**2. Intelligent Memory Features**
- Memory processing pipeline (photos → family members → timeline)
- "On this day" smart suggestions
- Facial recognition and automatic categorization
- Cultural heritage preservation workflows

**3. Complete Gaming System**
- Mafia game with role assignment and phase management
- Location-based Among Us variant with GPS verification
- Traditional Middle Eastern card games
- Cheat detection and rule enforcement

**4. Advanced Travel Features**
- AI tour guide with family preference learning
- Collaborative itinerary creation
- Real-time travel coordination
- Integration with family budget system

**5. Mobile Experience**
- No mobile app implementation
- No React Native integration for gaming
- No mobile-specific family features

## Development Roadmap 🚀

### **Phase 1: Foundation Integration (Priority 1 - Next 2-3 months)**

#### **Goal**: Connect existing components into unified system

**1.1 API Integration Layer**
```bash
# Create unified API gateway
cd elmowafy-travels-oasis/
# Add API routes connecting to hack2/ AI services
# Implement REST endpoints for memory processing
# Set up real-time WebSocket connections
```

**1.2 Database Unification**
- Design central database schema connecting family data, memories, travels, and games
- Migrate budget system data model to central database
- Implement data synchronization between components

**1.3 Memory Processing Pipeline**
- Connect AI photo analysis to family member recognition
- Implement memory categorization and timeline generation
- Create "smart suggestions" algorithm based on family history

#### **Expected Deliverables:**
- Unified family platform with AI backend integration
- Basic memory timeline showing family photos and experiences
- Working API layer for all components

### **Phase 2: Core Intelligence (Priority 2 - Months 3-5)**

#### **Goal**: Implement intelligent family features

**2.1 AI-Powered Memory Management**
- Facial recognition connecting photos to family members
- Smart memory suggestions ("On this day", similar experiences)
- Cultural heritage preservation with Arabic/English content management
- Automatic photo categorization by events, locations, people

**2.2 Intelligent Travel Assistant**  
- AI chatbot with family context awareness
- Travel recommendations based on family preferences and history
- Collaborative trip planning with budget integration
- Real-time travel coordination features

**2.3 Enhanced Family Tree Integration**
- Connect family tree to travel history and photo memories
- Interactive timeline showing family experiences per member
- Achievement system linking travels, education, and family milestones

#### **Expected Deliverables:**
- Smart family memory management system
- AI travel assistant with family context
- Integrated family timeline with photos, travels, and achievements

### **Phase 3: Gaming & Social Features (Priority 3 - Months 5-7)**

#### **Goal**: Complete AI game master and social features

**3.1 AI Game Master Implementation**
- Complete Mafia game with role assignment and AI referee
- Location-based Among Us variant with GPS verification
- Traditional Middle Eastern card games (Baloot, Concan)
- Real-time multiplayer synchronization and cheat detection

**3.2 Family Collaboration Features**
- Real-time collaborative travel planning
- Family decision-making tools and voting systems
- Multi-generational activity coordination
- Cultural celebration planning and memory creation

**3.3 Mobile Application**
- React Native app for family gaming and memory sharing
- Mobile-optimized AI assistant and travel features
- Offline capability for travel and gaming

#### **Expected Deliverables:**
- Complete AI game master system
- Mobile family app with core features
- Real-time collaboration tools

### **Phase 4: Advanced Intelligence (Priority 4 - Months 7-10)**

#### **Goal**: Advanced AI features and platform optimization

**4.1 Advanced AI Capabilities**
- Predictive travel suggestions based on family patterns
- Educational content analysis integrated with family learning
- Advanced cultural preservation with historical context
- Multi-modal AI (voice, image, text) for family interactions

**4.2 Educational Integration**
- Connect Canvas LMS, edX, and Moodle to family learning tracking
- AI tutor personalized for family learning styles
- Educational achievement integration with family timeline
- Collaborative family learning challenges

**4.3 Platform Optimization**
- Performance optimization for large family photo collections
- Advanced security and privacy controls
- Cloud deployment with CI/CD pipeline
- Analytics and family insights dashboard

#### **Expected Deliverables:**
- Advanced AI family assistant with predictive capabilities
- Integrated educational tracking system
- Production-ready platform with full deployment

## Next Immediate Actions 📋

### **Week 1-2: API Integration**
1. Set up API routes in elmowafy-travels-oasis/ to connect with hack2/ AI services
2. Create unified data models for family, memories, and travels
3. Implement basic photo upload and AI processing workflow

### **Week 3-4: Memory Pipeline**
1. Connect AI photo analysis to family member data
2. Implement basic memory timeline functionality
3. Create smart memory suggestion algorithm

### **Month 2: Travel Intelligence**
1. Enhance chatbot with family context and travel recommendations
2. Implement collaborative travel planning interface
3. Connect budget system to travel planning

### **Month 3: Gaming Foundation**
1. Implement basic Mafia game logic with role assignment
2. Create AI referee system for game management
3. Add real-time multiplayer capabilities

## Success Metrics 🎯

- **Integration Success**: All components communicate through unified API
- **Memory Intelligence**: AI can recognize family members in photos and suggest relevant memories
- **Travel Assistant**: AI provides personalized travel recommendations based on family history
- **Gaming System**: Family can play Mafia and other games with AI referee
- **Mobile Access**: Family can access all features from mobile devices
- **Cultural Preservation**: Platform maintains Arabic/English bilingual content with cultural context

The platform foundation is strong - now we need focused integration work to realize the complete vision of an intelligent family memory and travel ecosystem!