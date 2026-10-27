from abc import ABC, abstractmethod


class ModelClient(ABC):
    @abstractmethod
    def extract(self, image_bytes: bytes | None, text: str | None) -> dict: ...


class StubClient(ModelClient):
    """Fake extraction so the rest of the app can be built before the Meta key arrives."""

    def extract(self, image_bytes, text):
        return {
            "page_total": 1500,
            "rows": [
                {
                    "date": "2026-10-20",
                    "customer": "Demo Customer A",
                    "item": "Face cream",
                    "amount": 800,
                    "kind": "credit",
                    "confidence": 0.9,
                },
                {
                    "date": "2026-10-21",
                    "customer": "Demo Customer B",
                    "item": "Lipstick",
                    "amount": 700,
                    "kind": "sale",
                    "confidence": 0.55,
                },
            ],
        }


# MetaApiClient goes here once the first Meta API test works.
# class MetaApiClient(ModelClient):
#     def extract(self, image_bytes, text):
#         ...


def get_client() -> ModelClient:
    return StubClient()
