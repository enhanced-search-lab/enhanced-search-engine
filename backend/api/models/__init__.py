"""Model package for the api app.

Bu modül hem normalde `api.models` olarak hem de Django test discovery
sırasında yanlışlıkla kök seviyede `models` adıyla import edilebiliyor.
`models` olarak import edildiğinde aynı model sınıfları ikinci kez
kayıt edilmeye çalışıldığı için çakışma hatası alınıyor.

Bu nedenle model sınıflarını yalnızca doğru modül adıyla (`api.models`)
import edildiğinde içeri aktarıyoruz.
"""

if __name__ == "api.models":
	from .paperModel import Paper
	from .subscriberModel import Subscriber
	from .subscriptionModel import Subscription
	from .goodmatchModel import GoodMatch
	from .sentWorkModel import SentWork

	__all__ = ["Paper", "Subscriber", "Subscription", "GoodMatch", "SentWork"]
