# Solution

## Language

language: "python"

## Why derive the identifier from content

A registry stores the relationship between an identifier and an item, so we must trust the registry to provide the correct information.

A content-derived identifier is calculated directly from the item's content using SHA-256. Anyone with the content can calculate the identifier independently without a registry. This makes it easier to detect changes or fake content.

## What changes when the content changes

The identifier is linked to the content. If the content changes, its hash will also change with overwhelming probability. A second person can compare the newly calculated hash with the original identifier to detect substitution.

The same content always produces the same identifier. If the content changes, it must be treated as a different item with a new identifier. Hash collisions are theoretically possible.
