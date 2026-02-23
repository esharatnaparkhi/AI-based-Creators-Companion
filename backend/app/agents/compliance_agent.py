"""Compliance Agent — basic safety checks before publish."""
import re
import structlog

logger = structlog.get_logger()

# Basic blocklist — extend with your content policy
BLOCKED_PATTERNS = [
    r'\b(hate|violence|terrorism|exploit)\b',
    r'<script[^>]*>',
    r'(https?://[^\s]+\.onion)',
]

BLOCKED_WORDS = {
    "spam", "casino", "xxx",
}


class ComplianceAgent:
    """Checks content for safety and policy violations."""

    def is_safe(self, content: str) -> bool:
        """Return True if content passes all compliance checks."""
        if not content or not content.strip():
            return False

        content_lower = content.lower()

        # Check blocked words
        words = set(re.findall(r'\b\w+\b', content_lower))
        if words & BLOCKED_WORDS:
            logger.warning("compliance_blocked_word", matched=words & BLOCKED_WORDS)
            return False

        # Check blocked patterns
        for pattern in BLOCKED_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                logger.warning("compliance_blocked_pattern", pattern=pattern)
                return False

        # Length checks
        if len(content) > 50000:
            logger.warning("compliance_too_long", length=len(content))
            return False

        return True

    def check_platform_rules(self, content: str, platform: str) -> dict:
        """Validate content against platform-specific rules."""
        limits = {
            "x": 280,
            "instagram": 2200,
            "linkedin": 3000,
            "youtube": 5000,
            "email": 100000,
        }
        max_len = limits.get(platform, 10000)
        issues = []

        if len(content) > max_len:
            issues.append(f"Content exceeds {platform} limit of {max_len} chars (got {len(content)})")

        return {
            "platform": platform,
            "valid": len(issues) == 0,
            "issues": issues,
            "char_count": len(content),
            "char_limit": max_len,
        }

    async def review_before_publish(self, content: str, platform: str) -> dict:
        """Full pre-publish review."""
        safe = self.is_safe(content)
        platform_check = self.check_platform_rules(content, platform)

        result = {
            "approved": safe and platform_check["valid"],
            "safety_passed": safe,
            "platform_check": platform_check,
            "requires_human_review": False,
        }

        # Flag borderline content for human review
        if any(word in content.lower() for word in ["controversial", "sensitive", "political"]):
            result["requires_human_review"] = True

        return result


compliance_agent = ComplianceAgent()