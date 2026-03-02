# 📜 WizyClub Refactoring Geçmişi

Bu belge projenin refactoring süreci boyunca (22 Şubat 2026 ve sonrası) yapay zeka ve sistem arasında geçen komutları, adımları ve ilgili to-do planlamasını kayıt altında tutmak için oluşturulmuştur.

## 🟢 Bölüm 1 - Başlangıç (22 Şubat 2026)

### Prompt 1: Kapsamlı Kod İnceleme

**Kullanıcı İsteği:**
Kapsamlı bir "Clean Architecture (Layered)" incelemesi talep edildi.
Presentation (UI, state, yönlendirme, hook vb. işlevler) yalnızca domain ve core katmanlarını içe aktarmalı.
Domain katmanı (saf iş nesneleri vb.) yalnızca core katmanını içe aktarmalı.
Data katmanı (api vb. dış veri sağlayıcı katmanlar) domain ve core katmanlarını içe aktarmalı.
Bağımlılıklar içe doğru Presentation -> Domain <- Data şeklinde akmalı. Code review checklist: Layer violations, Component analysis, Code quality, RN best practices, Expo SDK 54, State Management, File Structure, Security, DI, Error Handling. Video kütüphanesi olarak react-native-video kullanılacak.

**Sonuç:**
Projenin root klasöründe detaylı `CODE_REVIEW_REPORT.md` dosyası oluşturularak katman tabanlı eksikler analiz edildi. En acil konular P0 (hardcoded credential, god componentlar, doğrudan data ve supabase layer ihlalleri vb.) olarak numaralandırıldı.

### Prompt 2: Hızlı Eylem Planı (Todo List)

**Kullanıcı İsteği:**
Oluşturulan `CODE_REVIEW_REPORT.md` doğrultusunda, bir To-Do list (kılavuz) dosyası (markdown olarak root klasöre) talep edildi. Adımların kolaydan zora (önce basit hızlı işlemler, sonra daha zor olan, örn. any tipleri, DRT düzeltmeleri, Supabase doğrudan iletişim düzeltmeleri) sıralanması istendi. Her adımdan sonra `tsc --noEmit` çalıştırılıp kontrol edilmesi, ve tamamlandığında işlenmesi kuralı koyuldu.

**Sonuç:**
`REFACTOR_TODO.md` dosyası root dizini altına oluşturuldu. Faz 0 (Zaten Tamamlanan), Faz 1 (Hızlı Düzeltmeler), Faz 2 (DI Container + Layer violations), Faz 3, 4, 5, 6 olarak 28 ana check box çıkarıldı.

{
  "task": "comprehensive_clean_architecture_code_review",
  "project": {
    "framework": "React Native",
    "sdk": "Expo SDK 54",
    "architecture": "Clean Architecture (Layered)"
  },
  "instructions": {
    "language": "Turkish",
    "output_format": "Markdown",
    "output_path": "./CODE_REVIEW_REPORT.md",
    "output_language": "Tüm rapor Türkçe yazılmalıdır"
  },
  "architecture_rules": {
    "layers": {
      "presentation": {
        "path": "mobile/src/presentation",
        "allowed_imports": ["domain", "core"],
        "forbidden_imports": ["data"],
        "responsibilities": [
          "UI Components (screens, widgets, atoms, molecules, organisms)",
          "State Management (hooks, contexts, stores, viewmodels)",
          "Navigation configuration",
          "User Input Handling",
          "UI Logic only - NO business logic"
        ],
        "naming_conventions": {
          "screens": "PascalCase + Screen suffix (e.g., HomeScreen.tsx)",
          "components": "PascalCase (e.g., UserCard.tsx)",
          "hooks": "camelCase + use prefix (e.g., useAuth.ts)",
          "styles": "camelCase + .styles suffix (e.g., home.styles.ts)",
          "viewmodels": "PascalCase + ViewModel suffix (e.g., HomeViewModel.ts)"
        }
      },
      "domain": {
        "path": "mobile/src/domain",
        "allowed_imports": ["core"],
        "forbidden_imports": ["presentation", "data"],
        "responsibilities": [
          "Entities / Models (pure business objects - NO framework dependencies)",
          "Use Cases / Interactors (business logic orchestration)",
          "Repository Interfaces (abstractions/contracts only)",
          "Domain Exceptions / Errors",
          "Value Objects",
          "Domain Services"
        ],
        "naming_conventions": {
          "entities": "PascalCase (e.g., User.ts, Employee.ts)",
          "useCases": "PascalCase + UseCase suffix (e.g., GetEmployeesUseCase.ts)",
          "repositories": "I prefix + PascalCase + Repository (e.g., IUserRepository.ts)",
          "services": "PascalCase + Service suffix (e.g., ValidationService.ts)"
        },
        "critical_rule": "Domain layer must be PURE - zero external/framework dependencies"
      },
      "data": {
        "path": "mobile/src/data",
        "allowed_imports": ["domain", "core"],
        "forbidden_imports": ["presentation"],
        "responsibilities": [
          "Repository Implementations (concrete classes)",
          "Data Sources (Remote API / Local Storage)",
          "DTOs (Data Transfer Objects)",
          "Mappers (DTO <-> Entity transformations)",
          "API Clients / Network Layer",
          "Database Access Layer",
          "Caching Strategies"
        ],
        "naming_conventions": {
          "repositories": "PascalCase + RepositoryImpl suffix (e.g., UserRepositoryImpl.ts)",
          "dataSources": {
            "remote": "PascalCase + RemoteDataSource (e.g., UserRemoteDataSource.ts)",
            "local": "PascalCase + LocalDataSource (e.g., UserLocalDataSource.ts)"
          },
          "mappers": "PascalCase + Mapper suffix (e.g., UserMapper.ts)",
          "dtos": "PascalCase + DTO suffix (e.g., UserDTO.ts)",
          "api": "PascalCase + Api suffix (e.g., AuthApi.ts)"
        }
      },
      "core": {
        "path": "mobile/src/core",
        "allowed_imports": [],
        "forbidden_imports": ["presentation", "domain", "data"],
        "responsibilities": [
          "Constants / Config",
          "Utils / Helpers (pure functions)",
          "Theme / Design Tokens",
          "Shared Types / Interfaces",
          "Extensions",
          "Base Error Classes",
          "DI Container Configuration",
          "Navigation Types"
        ],
        "critical_rule": "Core must be completely independent - imported by all, imports none"
      }
    },
    "dependency_rule": {
      "description": "Bağımlılıklar içe doğru akmalı",
      "flow": "Presentation → Domain ← Data",
      "visualization": [
        "┌─────────────────────────────────────────┐",
        "│            PRESENTATION                 │",
        "│  (UI, Screens, Components, ViewModels)  │",
        "└─────────────────┬───────────────────────┘",
        "                  │ uses",
        "                  ▼",
        "┌─────────────────────────────────────────┐",
        "│              DOMAIN                     │",
        "│  (Entities, UseCases, Interfaces)       │",
        "└─────────────────▲───────────────────────┘",
        "                  │ implements",
        "┌─────────────────┴───────────────────────┐",
        "│               DATA                      │",
        "│  (Repositories, DataSources, DTOs)      │",
        "└─────────────────────────────────────────┘",
        "",
        "┌─────────────────────────────────────────┐",
        "│               CORE                      │",
        "│  (Utils, Constants, Shared Types)       │",
        "│      ↑ imported by ALL layers           │",
        "└─────────────────────────────────────────┘"
      ]
    }
  },
  "review_checklist": {
    "1_layer_violations": {
      "priority": "🔴 CRITICAL",
      "description": "Katman ihlalleri - Hemen düzeltilmeli",
      "checks": [
        {
          "id": "LV001",
          "check": "Presentation layer Data layer'dan doğrudan import yapıyor mu?",
          "violation_example": "import { UserRepositoryImpl } from '../../data/repositories'",
          "correct_example": "import { IUserRepository } from '../../domain/repositories'"
        },
        {
          "id": "LV002",
          "check": "Domain layer Presentation veya Data'dan import yapıyor mu?",
          "violation_example": "import { supabase } from '../../data/supabase'",
          "correct_example": "Domain hiçbir dış katmandan import yapmamalı"
        },
        {
          "id": "LV003",
          "check": "Core layer başka bir katmandan import yapıyor mu?",
          "violation_example": "import { User } from '../domain/entities'",
          "correct_example": "Core tamamen bağımsız olmalı"
        },
        {
          "id": "LV004",
          "check": "Circular dependency var mı?",
          "how_to_detect": "A imports B, B imports A pattern"
        },
        {
          "id": "LV005",
          "check": "Business logic Presentation layer'da mı?",
          "violation_indicators": [
            "Complex calculations in components",
            "Data validation beyond UI in screens",
            "API response transformation in hooks",
            "Business rules in event handlers"
          ]
        },
        {
          "id": "LV006",
          "check": "UI kodu Domain veya Data layer'da mı?",
          "violation_indicators": [
            "React imports in domain",
            "JSX in non-presentation files",
            "StyleSheet in domain/data"
          ]
        },
        {
          "id": "LV007",
          "check": "Framework dependencies Domain layer'da mı?",
          "forbidden_in_domain": [
            "react",
            "react-native",
            "expo-*",
            "@react-navigation",
            "supabase",
            "axios",
            "AsyncStorage"
          ]
        }
      ]
    },
    "2_component_analysis": {
      "priority": "🟠 HIGH",
      "description": "Component parçalama ve organizasyon analizi",
      "checks": [
        {
          "id": "CA001",
          "check": "300 satırı aşan componentler",
          "action": "Daha küçük sub-componentlere bölünmeli",
          "output_format": {
            "file": "dosya yolu",
            "lines": "satır sayısı",
            "suggested_splits": ["önerilen component isimleri"]
          }
        },
        {
          "id": "CA002",
          "check": "5'ten fazla useState hook kullanan componentler",
          "action": "Custom hook'a extract edilmeli veya useReducer kullanılmalı",
          "output_format": {
            "file": "dosya yolu",
            "useState_count": "sayı",
            "suggested_hook_name": "useXxxState"
          }
        },
        {
          "id": "CA003",
          "check": "Tekrarlanan JSX pattern'leri",
          "action": "Shared component oluşturulmalı",
          "detection": "3+ dosyada benzer JSX bloğu"
        },
        {
          "id": "CA004",
          "check": "Inline style kullanımı",
          "action": "StyleSheet'e taşınmalı",
          "exception": "Dinamik style'lar hariç"
        },
        {
          "id": "CA005",
          "check": "Props drilling (3+ seviye)",
          "action": "Context veya state management kullanılmalı"
        },
        {
          "id": "CA006",
          "check": "Single Responsibility Principle ihlali",
          "indicators": [
            "Birden fazla unrelated state",
            "Birden fazla useEffect with different concerns",
            "Component name doesn't describe single purpose"
          ]
        },
        {
          "id": "CA007",
          "check": "God Components (her şeyi yapan dev componentler)",
          "indicators": [
            "500+ lines",
            "10+ useState",
            "Multiple API calls",
            "Multiple contexts consumed"
          ]
        }
      ]
    },
    "3_code_quality": {
      "priority": "🟠 HIGH",
      "description": "Kod kalitesi ve best practices",
      "checks": [
        {
          "id": "CQ001",
          "check": "TypeScript 'any' kullanımı",
          "severity": "high",
          "action": "Proper type/interface tanımlanmalı"
        },
        {
          "id": "CQ002",
          "check": "Async operasyonlarda error handling eksikliği",
          "pattern_to_find": "async function without try-catch or .catch()"
        },
        {
          "id": "CQ003",
          "check": "Console.log statements",
          "action": "Production'da kaldırılmalı veya proper logging kullanılmalı"
        },
        {
          "id": "CQ004",
          "check": "Hardcoded strings",
          "examples": ["API URLs", "Error messages", "Route names"],
          "action": "Constants'a taşınmalı"
        },
        {
          "id": "CQ005",
          "check": "Magic numbers",
          "action": "Named constants kullanılmalı"
        },
        {
          "id": "CQ006",
          "check": "DRY (Don't Repeat Yourself) ihlalleri",
          "detection": "Similar code blocks in multiple files"
        },
        {
          "id": "CQ007",
          "check": "50 satırı aşan fonksiyonlar",
          "action": "Daha küçük fonksiyonlara bölünmeli"
        },
        {
          "id": "CQ008",
          "check": "Eksik veya incomplete TypeScript interfaces",
          "indicators": ["Partial<> overuse", "Optional everything", "Missing return types"]
        },
        {
          "id": "CQ009",
          "check": "Unused imports ve variables",
          "action": "Kaldırılmalı"
        },
        {
          "id": "CQ010",
          "check": "Inconsistent naming conventions",
          "examples": ["camelCase vs snake_case mix", "Inconsistent file naming"]
        },
        {
          "id": "CQ011",
          "check": "Commented out code blocks",
          "action": "Kaldırılmalı, gerekirse git history'den erişilebilir"
        },
        {
          "id": "CQ012",
          "check": "TODO/FIXME comments without issue tracking",
          "action": "Issue oluşturulmalı veya düzeltilmeli"
        }
      ]
    },
    "4_react_native_best_practices": {
      "priority": "🟡 MEDIUM",
      "description": "React Native specific optimizations",
      "checks": [
        {
          "id": "RN001",
          "check": "ScrollView içinde .map() ile uzun listeler",
          "action": "FlatList veya SectionList kullanılmalı"
        },
        {
          "id": "RN002",
          "check": "List render'larda eksik veya yanlış key prop",
          "violation": "key={index} usage",
          "correct": "key={item.id} (unique identifier)"
        },
        {
          "id": "RN003",
          "check": "Memoization eksikliği",
          "check_for": [
            "Heavy components without React.memo",
            "Expensive calculations without useMemo",
            "Callback functions without useCallback in deps"
          ]
        },
        {
          "id": "RN004",
          "check": "Render içinde inline function tanımları",
          "violation": "onPress={() => handlePress(item)}",
          "correct": "useCallback ile tanımlanmış handler"
        },
        {
          "id": "RN005",
          "check": "Image optimization",
          "checks": [
            "Large images without resizeMode",
            "Missing image caching",
            "No placeholder/loading states"
          ]
        },
        {
          "id": "RN006",
          "check": "Keyboard handling",
          "checks": [
            "KeyboardAvoidingView usage",
            "Keyboard dismiss on tap",
            "Proper keyboard type for inputs"
          ]
        },
        {
          "id": "RN007",
          "check": "Safe area handling",
          "check_for": "SafeAreaView or useSafeAreaInsets usage"
        },
        {
          "id": "RN008",
          "check": "Platform-specific code organization",
          "patterns": [".ios.tsx", ".android.tsx", "Platform.select()"]
        },
        {
          "id": "RN009",
          "check": "useEffect cleanup functions",
          "check_for": [
            "Subscriptions without unsubscribe",
            "Timers without clearTimeout/clearInterval",
            "Event listeners without removal"
          ]
        },
        {
          "id": "RN010",
          "check": "Unnecessary re-renders",
          "detection_methods": [
            "React DevTools Profiler",
            "why-did-you-render library",
            "Console logging in render"
          ]
        }
      ]
    },
    "5_expo_sdk_54_compliance": {
      "priority": "🟡 MEDIUM",
      "description": "Expo SDK 54 uyumluluğu",
      "checks": [
        {
          "id": "EX001",
          "check": "Deprecated API kullanımı",
          "action": "SDK 54 changelog kontrol edilmeli"
        },
        {
          "id": "EX002",
          "check": "Package version uyumluluğu",
          "action": "npx expo install ile uyumlu versiyonlar yüklenmeli"
        },
        {
          "id": "EX003",
          "check": "New Architecture (Fabric) hazırlığı",
          "checks": [
            "Turbo Modules support",
            "Fabric compatible components"
          ]
        },
        {
          "id": "EX004",
          "check": "expo-router kullanımı (eğer varsa)",
          "checks": [
            "File-based routing conventions",
            "Layout files",
            "Dynamic routes"
          ]
        },
        {
          "id": "EX005",
          "check": "Environment variables",
          "correct_approach": "expo-constants veya .env with babel plugin",
          "violation": "Hardcoded secrets in code"
        },
        {
          "id": "EX006",
          "check": "EAS Build configuration",
          "files_to_check": ["eas.json", "app.json", "app.config.js"]
        }
      ]
    },
    "6_state_management": {
      "priority": "🟠 HIGH",
      "description": "State management patterns ve sorunları",
      "checks": [
        {
          "id": "SM001",
          "check": "Global vs Local state kararları",
          "global_state_candidates": [
            "User authentication",
            "Theme settings",
            "App-wide notifications",
            "Cached data"
          ],
          "local_state_candidates": [
            "Form inputs",
            "UI toggles",
            "Component-specific loading"
          ]
        },
        {
          "id": "SM002",
          "check": "Gereksiz re-render'lara sebep olan state updates",
          "patterns": [
            "Object/array state without proper comparison",
            "Context value changes on every render"
          ]
        },
        {
          "id": "SM003",
          "check": "Async state handling",
          "required_states": ["loading", "error", "data/success"],
          "pattern": "Result<T, E> veya AsyncState<T> pattern"
        },
        {
          "id": "SM004",
          "check": "Complex state normalization",
          "when_needed": "Nested data structures, relational data"
        },
        {
          "id": "SM005",
          "check": "Context splitting",
          "issue": "Single large context causing unnecessary re-renders",
          "solution": "Split into focused contexts"
        },
        {
          "id": "SM006",
          "check": "State initialization from props",
          "violation": "useState(props.value) without sync mechanism"
        }
      ]
    },
    "7_file_structure": {
      "priority": "🟡 MEDIUM",
      "description": "Dosya ve klasör organizasyonu",
      "checks": [
        {
          "id": "FS001",
          "check": "Yanlış konumdaki dosyalar",
          "examples": [
            "Repository implementation in domain folder",
            "Component in data folder",
            "Entity in presentation folder"
          ]
        },
        {
          "id": "FS002",
          "check": "Eksik index.ts barrel exports",
          "benefit": "Cleaner imports",
          "pattern": "export * from './User'"
        },
        {
          "id": "FS003",
          "check": "Inconsistent folder naming",
          "patterns": ["kebab-case vs camelCase vs PascalCase"]
        },
        {
          "id": "FS004",
          "check": "Feature-based vs Type-based organization tutarlılığı",
          "feature_based": "/features/auth/components, /features/auth/hooks",
          "type_based": "/components/auth, /hooks/auth"
        },
        {
          "id": "FS005",
          "check": "Test dosyaları konumu",
          "options": ["__tests__ folder", ".test.ts alongside", "/tests root folder"]
        },
        {
          "id": "FS006",
          "check": "Shared vs Feature-specific code ayrımı",
          "shared_location": "/shared veya /common",
          "feature_location": "/features/[name]"
        }
      ]
    },
    "8_security": {
      "priority": "🔴 CRITICAL",
      "description": "Güvenlik kontrolleri",
      "checks": [
        {
          "id": "SC001",
          "check": "Kod içinde hardcoded sensitive data",
          "look_for": [
            "API keys",
            "Secret tokens",
            "Database credentials",
            "Private keys",
            "Passwords"
          ],
          "files_to_scan": ["*.ts", "*.tsx", "*.js", "*.json"]
        },
        {
          "id": "SC002",
          "check": "Token storage",
          "correct": "expo-secure-store usage",
          "violation": "AsyncStorage for sensitive data"
        },
        {
          "id": "SC003",
          "check": "Input validation",
          "where": "Before API calls and data processing"
        },
        {
          "id": "SC004",
          "check": "SQL injection prevention",
          "when": "Direct database queries"
        },
        {
          "id": "SC005",
          "check": "Deep link validation",
          "check_for": "Proper URL parsing and validation"
        },
        {
          "id": "SC006",
          "check": "Sensitive data in logs",
          "violation": "console.log(user.password)"
        }
      ]
    },
    "9_dependency_injection": {
      "priority": "🟡 MEDIUM",
      "description": "Dependency Injection ve Inversion of Control",
      "checks": [
        {
          "id": "DI001",
          "check": "Repository'lerin interface üzerinden kullanımı",
          "correct": "Presentation uses IUserRepository",
          "violation": "Presentation uses UserRepositoryImpl directly"
        },
        {
          "id": "DI002",
          "check": "UseCase'lerin dependency injection ile alınması",
          "patterns": ["Constructor injection", "Container/Provider pattern"]
        },
        {
          "id": "DI003",
          "check": "Testability",
          "check_for": "Dependencies that can be mocked"
        },
        {
          "id": "DI004",
          "check": "DI Container configuration",
          "location": "core layer"
        }
      ]
    },
    "10_error_handling": {
      "priority": "🟠 HIGH",
      "description": "Error handling patterns",
      "checks": [
        {
          "id": "EH001",
          "check": "Centralized error handling",
          "pattern": "ErrorBoundary for React errors"
        },
        {
          "id": "EH002",
          "check": "API error handling consistency",
          "pattern": "Unified error response handling"
        },
        {
          "id": "EH003",
          "check": "User-friendly error messages",
          "violation": "Showing raw error.message to user"
        },
        {
          "id": "EH004",
          "check": "Error logging",
          "for": "Debugging and monitoring"
        },
        {
          "id": "EH005",
          "check": "Domain-specific exceptions",
          "location": "domain/exceptions",
          "examples": ["ValidationError", "NotFoundError", "UnauthorizedError"]
        }
      ]
    }
  },
  "video_library_directive": {
    "current_library": "react-native-video",
    "strict_instruction": "DO NOT suggest migration to expo-video or expo-av. Project will continue using react-native-video.",
    "review_items": [
      {
        "id": "VID001",
        "check": "Video player lifecycle management",
        "aspects": ["onLoad", "onEnd", "onError handlers"]
      },
      {
        "id": "VID002",
        "check": "Memory cleanup on component unmount",
        "pattern": "Proper ref cleanup in useEffect return"
      },
      {
        "id": "VID003",
        "check": "Error handling for video playback",
        "required": "onError handler with user feedback"
      },
      {
        "id": "VID004",
        "check": "Loading states implementation",
        "required": "onLoadStart, onLoad, loading indicator"
      },
      {
        "id": "VID005",
        "check": "Video player ref management",
        "pattern": "useRef<Video> with proper typing"
      },
      {
        "id": "VID006",
        "check": "Fullscreen handling",
        "aspects": ["Orientation changes", "Status bar", "Safe areas"]
      }
    ]
  },
  "output_structure": {
    "file_name": "CODE_REVIEW_REPORT.md",
    "file_path": "./CODE_REVIEW_REPORT.md",
    "language": "Turkish",
    "sections": [
      {
        "order": 1,
        "title": "📊 YÖNETİCİ ÖZETİ (Executive Summary)",
        "content": [
          "Analiz tarihi ve süresi",
          "Toplam dosya sayısı (katman bazlı)",
          "Genel mimari uyumluluk skoru (0-100)",
          "Risk matrisi tablosu",
          "Kritik/Yüksek/Orta öncelikli sorun sayıları",
          "Hemen aksiyon gerektiren ilk 3 madde"
        ],
        "format": "Summary table + key metrics"
      },
      {
        "order": 2,
        "title": "🚨 KRİTİK SORUNLAR (Immediate Action Required)",
        "priority": "P0",
        "content": [
          "Katman ihlalleri listesi",
          "Güvenlik açıkları listesi",
          "Her sorun için:",
          "  - Dosya yolu ve satır numarası",
          "  - Sorun açıklaması",
          "  - Mevcut kod örneği",
          "  - Düzeltme önerisi (kod örneği ile)",
          "  - Etki analizi"
        ],
        "format": "Detailed issue cards with code snippets"
      },
      {
        "order": 3,
        "title": "⚠️ YÜKSEK ÖNCELİKLİ SORUNLAR",
        "priority": "P1",
        "content": [
          "Component parçalama ihtiyaçları (tablo formatında)",
          "Kod kalitesi sorunları",
          "State management problemleri",
          "Error handling eksiklikleri",
          "Her sorun için detaylı açıklama ve çözüm önerisi"
        ],
        "format": "Grouped by category with action items"
      },
      {
        "order": 4,
        "title": "📝 ORTA ÖNCELİKLİ SORUNLAR",
        "priority": "P2",
        "content": [
          "Best practice ihlalleri",
          "Performans iyileştirme fırsatları",
          "Dosya yapısı düzenlemeleri",
          "Naming convention inconsistencies"
        ],
        "format": "Checklist format"
      },
      {
        "order": 5,
        "title": "🔄 REFACTORING PLANI",
        "content": [
          {
            "subsection": "Oluşturulması Gereken Yeni Componentler",
            "format_per_item": {
              "component_name": "Önerilen isim",
              "current_location": "Mevcut kod lokasyonu",
              "target_location": "Hedef dosya yolu",
              "reason": "Neden ayrılmalı",
              "priority": "P0/P1/P2",
              "estimated_effort": "hours"
            }
          },
          {
            "subsection": "Extract Edilmesi Gereken Custom Hooks",
            "format_per_item": {
              "hook_name": "useXxx",
              "source_component": "Kaynak component",
              "extracted_logic": "Hangi logic extract edilecek",
              "priority": "P0/P1/P2"
            }
          },
          {
            "subsection": "Taşınması Gereken Dosyalar",
            "format_per_item": {
              "file": "Mevcut yol",
              "from_layer": "Şu anki katman",
              "to_layer": "Hedef katman",
              "reason": "Neden taşınmalı"
            }
          },
          {
            "subsection": "Birleştirilmesi Gereken Dosyalar",
            "format_per_item": {
              "files": ["dosya1.ts", "dosya2.ts"],
              "merged_name": "Birleşik dosya adı",
              "reason": "Neden birleştirilmeli"
            }
          }
        ]
      },
      {
        "order": 6,
        "title": "📁 KATMAN BAZLI ANALİZ",
        "content": [
          {
            "layer": "Presentation",
            "metrics": {
              "total_files": "number",
              "screens": "number",
              "components": "number",
              "hooks": "number"
            },
            "issues": "list",
            "score": "0-100"
          },
          {
            "layer": "Domain",
            "metrics": {
              "total_files": "number",
              "entities": "number",
              "useCases": "number",
              "repositories_interfaces": "number"
            },
            "issues": "list",
            "score": "0-100"
          },
          {
            "layer": "Data",
            "metrics": {
              "total_files": "number",
              "repository_implementations": "number",
              "data_sources": "number",
              "mappers": "number"
            },
            "issues": "list",
            "score": "0-100"
          },
          {
            "layer": "Core",
            "metrics": {
              "total_files": "number",
              "utils": "number",
              "constants": "number",
              "types": "number"
            },
            "issues": "list",
            "score": "0-100"
          }
        ]
      },
      {
        "order": 7,
        "title": "📈 DEPENDENCY GRAPH",
        "content": [
          "ASCII veya Mermaid format dependency diagram",
          "İhlal edilen dependency'ler kırmızı işaretli",
          "Circular dependency'ler belirtilmiş"
        ],
        "format": "Mermaid diagram veya ASCII art"
      },
      {
        "order": 8,
        "title": "✅ İYİ UYGULAMALAR (Positives)",
        "content": [
          "Doğru implement edilmiş patterns",
          "Takdir edilecek kod kalitesi örnekleri",
          "Korunması gereken conventions",
          "İyi organize edilmiş alanlar"
        ],
        "format": "Praise list with examples"
      },
      {
        "order": 9,
        "title": "🎯 AKSİYON PLANI",
        "content": [
          {
            "phase": "Phase 1 - Critical (Bu Hafta)",
            "tasks": ["Kritik güvenlik ve mimari düzeltmeleri"],
            "estimated_hours": "number"
          },
          {
            "phase": "Phase 2 - High Priority (2 Hafta)",
            "tasks": ["Component refactoring", "State management fixes"],
            "estimated_hours": "number"
          },
          {
            "phase": "Phase 3 - Improvements (1 Ay)",
            "tasks": ["Performance optimizations", "Code quality improvements"],
            "estimated_hours": "number"
          }
        ],
        "format": "Gantt-style timeline or task list"
      },
      {
        "order": 10,
        "title": "📚 EKLER",
        "content": [
          "Sorunlu dosyaların tam listesi",
          "Kullanılan analiz araçları",
          "Referans dökümanlar ve linkler"
        ]
      }
    ]
  },
  "execution_instructions": {
    "step_1": {
      "action": "Tüm proje dosyalarını tara",
      "paths": [
        "mobile/src/presentation/**/*",
        "mobile/src/domain/**/*",
        "mobile/src/data/**/*",
        "mobile/src/core/**/*"
      ],
      "file_types": [".ts", ".tsx", ".js", ".jsx"]
    },
    "step_2": {
      "action": "Her dosya için import statement'larını analiz et",
      "check": "Layer violation detection"
    },
    "step_3": {
      "action": "Component complexity analizi",
      "metrics": ["Line count", "Hook count", "Props count", "Cyclomatic complexity"]
    },
    "step_4": {
      "action": "Pattern detection",
      "patterns": ["Duplicate code", "Anti-patterns", "Missing abstractions"]
    },
    "step_5": {
      "action": "Security scan",
      "targets": ["Hardcoded secrets", "Insecure storage", "Unvalidated inputs"]
    },
    "step_6": {
      "action": "Raporu oluştur ve ./CODE_REVIEW_REPORT.md olarak kaydet"
    }
  },
  "scoring_rubric": {
    "layer_compliance": {
      "weight": 30,
      "criteria": {
        "100": "Zero layer violations",
        "75": "1-3 minor violations",
        "50": "4-10 violations or 1-2 critical",
        "25": "11-20 violations or 3-5 critical",
        "0": "20+ violations or architectural chaos"
      }
    },
    "code_quality": {
      "weight": 25,
      "criteria": {
        "100": "Clean code, proper typing, no warnings",
        "75": "Minor issues, few any types",
        "50": "Multiple issues, several any types",
        "25": "Significant quality issues",
        "0": "Poor quality throughout"
      }
    },
    "component_structure": {
      "weight": 20,
      "criteria": {
        "100": "Well-organized, proper separation",
        "75": "Minor improvements needed",
        "50": "Some large components need splitting",
        "25": "Many god components",
        "0": "No structure"
      }
    },
    "best_practices": {
      "weight": 15,
      "criteria": {
        "100": "Follows all RN best practices",
        "75": "Minor deviations",
        "50": "Several missed optimizations",
        "25": "Many anti-patterns",
        "0": "Ignores best practices"
      }
    },
    "security": {
      "weight": 10,
      "criteria": {
        "100": "No security issues",
        "75": "Minor concerns",
        "50": "Some vulnerabilities",
        "25": "Critical vulnerabilities",
        "0": "Severe security risks"
      }
    }
  }
}

Oluşturduğun 

CODE_REVIEW_REPORT.md
dosyasını okuyup düzeltmelere başlayalım. Bir to do list yap ve root'a .md olarak hazırla. Her adımı yaz ve her adımdan sonra tsx kontrolü yap. Önce basit hızlı işlemleri tamamla ardından zorları yapmaya başlayalım eksiksiz ve sorunsuz devam edelim. Her adımdan sonra tsx kontrolü geçerse eğer hemen o adımın tamamlandığını dosyaya yaz. Kurallarımıza dikkat et. Her tamamlanan tamamlandı olarak işaretlenecek unutma.

---

*Not: Bu belge, yeni promptlarla birlikte, yapılan işlerin tarihçesini güvenli bir şekilde sunmak üzere periyodik olarak güncellenmelidir.*
