
import hashlib
import json


def create(content):
    """Create an item with an identifier derived from its content."""
    return {
        "content": content,
        "id": derive(content),
    }


def derive(content):
    """Recompute the identifier from content alone."""
    canonical_content = json.dumps(
        content,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )

    return hashlib.sha256(
        canonical_content.encode("utf-8")
    ).hexdigest()


def demo():
    content = {
        "title": "Quarterly report",
        "body": "Revenue held steady.",
        "author": "avery",
    }

    item = create(content)

    same_content = {
        "author": "avery",
        "body": "Revenue held steady.",
        "title": "Quarterly report",
    }

    assert derive(same_content) == item["id"]
    tampered = {**content, "body": "Revenue tripled."}
    assert derive(tampered) != item["id"]

    print("ok:", item["id"])


if __name__ == "__main__":
    demo()
