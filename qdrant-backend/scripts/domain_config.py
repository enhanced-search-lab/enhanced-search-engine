# qdrant-backend/scripts/domain_config.py

"""
Bu dosya, hangi OpenAlex concept'lerinin domain'e dahil olacağını ve
kalite / boyut kısıtlarını tanımlar.

Concept ID bulmak için:
- https://openalex.org üstünde kavramı ara (örn: "Computer networks")
- Concept sayfasına gir: örn. https://openalex.org/C172173386
- Buradaki "172173386" numeric id -> concepts.id filtresinde bunu kullanacağız.
"""

DOMAIN_CONCEPT_IDS = {
    "computer_networks": [
        "C31258907",  # ÖRNEK: Computer networks (C172173386 → 172173386)
    ],
    "molecular_communication": [
        "C2779767902"
        # Buraya Molecular communication, Nanonetworks concept numeric ID'lerini ekle
        # Ör: "123456789",
    ],
    "wireless_sensor_networks": [
        "C24590314"
        # WSN concept id
    ],
    "energy_harvesting": [
        "C101518730"
        # Energy harvesting / energy efficient WSN vs. concept id
    ],
}

# ---- Kalite / boyut kısıtları ----

YEAR_MIN = 2000          # 2000 ve sonrası
MIN_CITATIONS = 5        # En az 5 atıf
GLOBAL_TARGET = 200_000  # Toplam hedef makale sayısı (kabaca)
PER_BUCKET_LIMIT = 80_000  # Her bucket için üst limit

# OpenAlex API için mail adresin
OPENALEX_MAILTO = "ceydasen40@gmail.com"