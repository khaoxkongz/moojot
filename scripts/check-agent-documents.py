#!/usr/bin/env python3
"""Check agent documents. Meaning and evidence still require source review."""

import argparse
import importlib.util
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path


sys.dont_write_bytecode = True
PROJECT_ROOT = Path(__file__).resolve().parent.parent
EXCEPTIONS_PATH = "docs/agents/document-exceptions.json"
RECORD = re.compile(
    r"^\s*(?:\*\*)?(?:Status|Type|Label|Mode|Assignee|Done in|Blocked by|"
    r"Source|User stories|Parent|Published|Approval):(?:\*\*)?", re.I
)
# A list item that cites a commit, "- 2aab590 feat(native): subject", keeps the subject exactly as committed.
COMMIT_RECORD = re.compile(r"^\s*[-*+]\s+[0-9a-f]{7,40} [a-z]+(?:\([^)\n]*\))?!?: ")
FIELD_LABEL = re.compile(r"^\*\*[^*\n]+:\*\*\s*")
FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})")
CODE_SPAN = re.compile(r"(?<!`)(`+)(?!`)(.*?)\1(?!`)")
QUOTED = re.compile(r'"[^"\n]*"|“[^”\n]*”')
THAI = re.compile(r"[\u0e01-\u0e3a\u0e40-\u0e5b]")
LIST_MARKER = re.compile(r"^\s*(?:[-*+]\s+(?:\[[ xX]\]\s*)?|\d+[.)]\s+)")
INSTRUCTION = re.compile(
    r"^(?:Add|Adapt|Allow|Apply|Assert|Avoid|Bind|Call|Cancel|Capture|Change|Check|"
    r"Choose|Clear|Combine|Compare|Complete|Compose|Continue|Control|Convert|Cover|"
    r"Create|Define|Delete|Derive|Disable|Do|Drive|Enable|End|Enforce|Exercise|Expose|"
    r"Find|Finish|Follow|Handle|Honor|Identify|Ignore|Include|Inspect|Keep|Label|Leave|"
    r"Limit|Mark|Match|Move|Normalize|Observe|Open|Pass|Persist|Plan|Prepare|Preserve|"
    r"Prevent|Process|Provide|Prove|Read|Recheck|Reconcile|Record|Refresh|Reject|"
    r"Release|Remove|Replace|Report|Request|Require|Reset|Resize|Resolve|Restore|"
    r"Retain|Retire|Return|Reuse|Run|Save|Search|Select|Send|Separate|Set|Share|"
    r"Show|Skip|Specify|Start|Stop|Store|Supply|Support|Suspend|Switch|Synchronize|"
    r"Tap|Test|Track|Treat|Update|Use|Wait|Wrap)\b", re.I
)
NOUN_SUBJECT = re.compile(
    r"^\w+\s+(?:is|are|was|were|has|have|covers|uses|owns|requires|remains|"
    r"starts|ends|contains|reads|shows|creates|means|returns|supports|provides)\b", re.I
)


class Repository:
    def __init__(self, root, staged):
        self.root = root.resolve()
        self.staged = staged
        self.cache = {}
        self.index = None
        if staged:
            result = self.git("ls-files", "-z")
            self.index = set(result.stdout.split("\0")) - {""}

    def git(self, *args, check=True):
        result = subprocess.run(
            ["git", "-C", str(self.root), *args], capture_output=True, text=True
        )
        if check and result.returncode:
            raise ValueError(result.stderr.strip() or "Cannot read the Git index.")
        return result

    def documents(self):
        if self.staged:
            return sorted(p for p in self.index if p.startswith(".scratch/") and p.endswith(".md"))
        return sorted(p.relative_to(self.root).as_posix() for p in (self.root / ".scratch").rglob("*.md"))

    def read(self, name):
        if name not in self.cache:
            if self.staged:
                if name in self.index:
                    self.cache[name] = self.git("show", ":" + name).stdout
                elif "node_modules" in Path(name).parts and (self.root / name).is_file():
                    self.cache[name] = (self.root / name).read_text(encoding="utf-8")
                else:
                    raise FileNotFoundError(name)
            else:
                self.cache[name] = (self.root / name).read_text(encoding="utf-8")
        return self.cache[name]

    def exists(self, name):
        if self.staged:
            return (name in self.index or any(p.startswith(name.rstrip("/") + "/") for p in self.index)
                    or ("node_modules" in Path(name).parts and (self.root / name).exists()))
        return (self.root / name).exists()


def masked(value):
    return "X" + " " * (len(value) - 1)


def markdown_lines(text):
    """Exclude literal code but preserve line positions for diagnostics."""
    result = []
    fence = None
    for number, raw in enumerate(text.splitlines(), 1):
        marker = FENCE.match(raw)
        if fence:
            if re.match(r"^ {0,3}" + re.escape(fence[0]) + "{" + str(fence[1]) + r",}\s*$", raw):
                fence = None
            result.append("")
        elif marker:
            fence = (marker[1][0], len(marker[1]), number)
            result.append("")
        else:
            result.append(CODE_SPAN.sub(lambda m: masked(m[0]), raw))
    return result, fence


def link_target(line, start):
    """Read an angle target or a target with balanced, escaped parentheses."""
    while start < len(line) and line[start].isspace():
        start += 1
    if start >= len(line):
        return ""
    if line[start] == "<":
        end = line.find(">", start + 1)
        return line[start + 1:end] if end != -1 else None
    depth = 0
    end = start
    while end < len(line):
        character = line[end]
        if character == "\\" and end + 1 < len(line):
            end += 2
            continue
        if character == "(":
            depth += 1
        elif character == ")":
            if depth == 0:
                break
            depth -= 1
        elif character.isspace() and depth == 0:
            break
        end += 1
    if depth:
        return None
    return line[start:end]


def reference_key(label):
    return " ".join(label.split()).casefold()


def link_end(line, start):
    depth = 1
    angle = False
    quote = None
    end = start
    while end < len(line) and depth:
        char = line[end]
        if char == "\\":
            end += 2
            continue
        if angle:
            angle = char != ">"
        elif quote:
            if char == quote:
                quote = None
        elif char == "<":
            angle = True
        elif char in "\"'" and end and line[end - 1].isspace():
            quote = char
        elif char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
        end += 1
    return end if depth == 0 else None


def prose_links(line):
    # Keep link labels. Destinations and titles are literal Markdown records.
    for match in reversed(list(re.finditer(r"!?\[([^\]\n]*)\]\(", line))):
        end = link_end(line, match.end())
        if end is not None:
            prefix = match.start() + (1 if line[match.start()] == "!" else 0)
            label_end = prefix + len(match[1]) + 2
            line = line[:label_end] + " " * (end - label_end) + line[end:]
    return line


def links(lines):
    definitions = {}
    for line in lines:
        match = re.match(r"^ {0,3}\[([^\]]+)\]:\s*", line)
        if match:
            definitions.setdefault(reference_key(match[1]), link_target(line, match.end()))
    for number, line in enumerate(lines, 1):
        if re.match(r"^ {0,3}\[[^\]]+\]:", line):
            continue
        for match in re.finditer(r"!?\[([^\]\n]*)\]\(", line):
            target = link_target(line, match.end()) if link_end(line, match.end()) is not None else None
            yield number, target
        for match in re.finditer(r"!?\[([^\]\n]+)\]\[([^\]\n]*)\]", line):
            key = reference_key(match[2] or match[1])
            yield number, definitions.get(key)
        for match in re.finditer(r"(?<!!)\[([^\]\n]+)\](?![\[(])", line):
            key = reference_key(match[1])
            if key in definitions:
                yield number, definitions[key]


def prose(lines):
    result = []
    for line in lines:
        if RECORD.match(line) or COMMIT_RECORD.match(line) or re.match(r"^ {0,3}\[[^\]]+\]:", line):
            result.append("")
            continue
        line = FIELD_LABEL.sub("", line)
        line = QUOTED.sub(lambda m: masked(m[0]) if THAI.search(m[0]) else m[0], line)
        line = prose_links(line)
        result.append(line)
    return result


def paragraphs(lines, ste):
    block = []
    first = 0
    tables = ste._markdown_table_cells(lines)
    for index, line in enumerate(lines):
        if index in tables:
            if block:
                yield first, " ".join(block)
                block = []
            for cell, _ in tables[index]:
                if cell:
                    yield index + 1, cell
            continue
        if not line.strip() or re.match(r"^\s*#", line):
            if block:
                yield first, " ".join(block)
                block = []
            continue
        if LIST_MARKER.match(line) and block:
            yield first, " ".join(block)
            block = []
        if not block:
            first = index + 1
        block.append(LIST_MARKER.sub("", line).strip())
    if block:
        yield first, " ".join(block)


def heading_anchors(text):
    lines, _ = markdown_lines(text)
    raw = text.splitlines()
    used = set()
    for index, line in enumerate(lines):
        match = re.match(r"^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$", line)
        heading = None
        if match:
            heading = re.sub(r"^ {0,3}#{1,6}\s+", "", raw[index]).rstrip(" #")
        elif re.match(r"^ {0,3}(?:=+|-+)\s*$", line) and index and lines[index - 1].strip():
            heading = raw[index - 1].strip()
        if heading is None:
            continue
        heading = re.sub(r"!?\[([^\]]+)\]\([^)]*\)", r"\1", heading)
        heading = re.sub(r"<[^>]*>", "", heading).replace("`", "").replace("*", "")
        base = "".join(c for c in heading.lower()
                       if unicodedata.category(c)[0] in "LMN" or c in " _-").replace(" ", "-")
        anchor = base
        suffix = 0
        while anchor in used:
            suffix += 1
            anchor = base + "-" + str(suffix)
        used.add(anchor)
    return used


def finding(file, line, rule, match, message, level="advisory-free"):
    return dict(file=file, line=line, rule=rule, match=match, message=message, level=level)


def inspect_document(repo, name, ste):
    from urllib.parse import unquote

    text = repo.read(name)
    raw = text.splitlines()
    markdown, fence = markdown_lines(text)
    clean = prose(markdown)
    found = [f for f in ste.lint("\n".join(clean), name)[0] if f["rule"] != "long-sentence"]
    if fence:
        found.append(finding(name, fence[2], "unclosed-fence", fence[0], "Close the code fence."))
    for number, line in enumerate(clean, 1):
        if THAI.search(line):
            found.append(finding(name, number, "thai-prose", THAI.search(line)[0],
                                 "Translate Thai prose. Mark exact literals with quotes or inline code."))
    for number, paragraph in paragraphs(clean, ste):
        sentences = re.split(r"(?<=[.!?])\s+", paragraph)
        complete = sum(bool(re.search(r"[.!?](?:\*\*|_)?$", s)) for s in sentences)
        if complete > 6:
            found.append(finding(name, number, "long-paragraph", str(complete),
                                 "Split the paragraph by topic. The limit is six sentences."))
        for sentence in sentences:
            sentence = sentence.strip("*_ ")
            limit = 20 if INSTRUCTION.match(sentence) and not NOUN_SUBJECT.match(sentence) else 25
            # Code masking preserves columns. Reattach punctuation before counting words.
            words = len(re.sub(r"\s+([,.;:!?])", r"\1", sentence).split())
            if words > limit:
                found.append(finding(name, number, "long-sentence", f"{words} words (limit {limit})",
                                     "Split the sentence while preserving every condition."))
    checked_links = 0
    manual_links = 0
    for number, target in links(markdown):
        if target is None:
            found.append(finding(name, number, "invalid-link", "", "Complete the link or its reference definition."))
            continue
        if re.match(r"^[a-z][a-z0-9+.-]*:", target, re.I):
            manual_links += 1
            continue
        target = re.sub(r"\\([() ])", r"\1", target)
        path_text, _, fragment = target.partition("#")
        destination = (repo.root / Path(name).parent / unquote(path_text)).resolve()
        try:
            relative = destination.relative_to(repo.root).as_posix()
        except ValueError:
            manual_links += 1
            continue
        checked_links += 1
        if not repo.exists(relative):
            found.append(finding(name, number, "missing-link", target, "Restore or update the repository link target."))
        elif fragment and destination.suffix == ".md":
            if unquote(fragment) not in heading_anchors(repo.read(relative)):
                found.append(finding(name, number, "missing-anchor", target, "Update the heading anchor or its incoming link."))
    for item in found:
        item["text"] = raw[item["line"] - 1]
    return found, checked_links, manual_links


def load_skill():
    path = PROJECT_ROOT / ".agents/skills/asd-ste100/scripts/ste-lint.py"
    if not path.is_file():
        raise ValueError("Restore the repository's asd-ste100 skill at " + str(path) + ". Document checks did not run.")
    spec = importlib.util.spec_from_file_location("ste_lint", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def apply_exceptions(found, records, documents):
    remaining = list(found)
    errors = []
    for entry in records:
        required = ("file", "rule", "text", "match", "reason")
        if (not isinstance(entry, dict) or set(entry) != set(required)
                or any(not isinstance(entry.get(k), str) or not entry[k].strip() for k in required)):
            errors.append("Each exception needs file, rule, exact text, match, and a reason.")
            continue
        if entry["file"] not in documents:
            errors.append("Stale exception: " + entry["file"])
            continue
        matches = [f for f in remaining if all(f[k] == entry[k] for k in ("file", "rule", "text", "match"))]
        if len(matches) != 1:
            errors.append("Stale or ambiguous exception: " + entry["file"] + " / " + entry["rule"])
        else:
            remaining.remove(matches[0])
    return remaining, errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=PROJECT_ROOT)
    parser.add_argument("--staged", action="store_true")
    args = parser.parse_args()
    try:
        ste = load_skill()
        repo = Repository(args.root, args.staged)
        documents = repo.documents()
        records = json.loads(repo.read(EXCEPTIONS_PATH))
        if not isinstance(records, list):
            raise ValueError("Document exceptions must be a JSON array.")
        found = []
        checked = manual = 0
        for name in documents:
            result, local, outside = inspect_document(repo, name, ste)
            found.extend(result)
            checked += local
            manual += outside
        remaining, errors = apply_exceptions(found, records, documents)
        for error in errors:
            print(error, file=sys.stderr)
        for item in remaining:
            print(f"{item['file']}:{item['line']} {item['rule']}: {item['message']} [{item['match']}]", file=sys.stderr)
        hard = sum(f["level"] == "advisory-free" for f in remaining)
        if hard or errors:
            print("Fix the findings. Record only exact, reviewed precision exceptions.", file=sys.stderr)
            return 1
        print(f"Agent documents: {len(documents)} files, {checked} repository links, {len(records)} reviewed exceptions.")
        print(f"Meaning and evidence require source review. {manual} remote or outside-repository references require manual checks.")
        return 0
    except (OSError, ValueError, KeyError, AttributeError) as error:
        print("Agent document check failed: " + str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
