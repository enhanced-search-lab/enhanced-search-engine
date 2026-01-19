"""Test discovery sırasında `import models` denemelerini yakalayan boş modül.

Django uygulama modelleri `api` uygulaması altında tanımlıdır; bu dosya, unittest
loader'ın `models` adlı ayrı bir paket ararken `api.models` paketini ikinci kez
uygulama olarak kaydetmesini engellemek için vardır.
"""

# Bilinçli olarak Django model tanımı eklemiyoruz.
