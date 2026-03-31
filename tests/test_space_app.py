from __future__ import annotations

import os
import unittest

os.environ.setdefault("GRADIO_ANALYTICS_ENABLED", "False")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")

from space import app as space_app


class SpaceAppTests(unittest.TestCase):
    def test_runtime_status_mentions_configured_models(self) -> None:
        markup = space_app.render_runtime_status()
        self.assertIn(space_app.TRANSLATION_MODEL_ID, markup)
        self.assertIn(space_app.ASR_MODEL_ID, markup)


if __name__ == "__main__":
    unittest.main()
