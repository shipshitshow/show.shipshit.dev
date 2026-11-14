import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import detect as d  # noqa: E402


# Test values are assembled at runtime from short pieces so no secret-shaped literal sits in the repository.
def j(*parts: str) -> str:
    return "".join(parts)


FILL = "aB3xK9mQ2zT7vR4wN8pL5cD1"  # 24 mixed characters, synthetic
OPENAI = j("sk", "-", FILL, "Zq")
GH = j("gh", "p_", "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8")
AWS = j("AK", "IA", "ABCDEFGH12345678")
SLACK = j("xo", "xb-", "1234567890-abcdefGHIJ")
JWT = j("ey", "JhbGciOiJIUzI1NiJ9", ".", "ey", "JzdWIiOiJ0ZXN0MTIzIn0", ".", "dGVzdHNpZ25hdHVyZTEyMzQ1")
CARD = j("4111", " ", "1111", " ", "1111", " ", "1111")  # passes Luhn, a public test number
IBAN = j("GB82", " ", "WEST", " ", "1234", " ", "5698", " ", "7654", " ", "32")  # public example IBAN


def cats(line, rules=None):
    return [m.category for m, _ in d.scan_line(line, rules or d.Rules())]


class Redaction(unittest.TestCase):
    def test_preview_is_prefix_and_length_only(self):
        self.assertEqual(d.redact(OPENAI), f"sk-...[{len(OPENAI)}]")
        self.assertNotIn(OPENAI[3:], d.redact(OPENAI))

    def test_short_values_do_not_leak(self):
        self.assertEqual(d.redact("ab"), "ab...[2]")


class Secrets(unittest.TestCase):
    def test_provider_keys(self):
        for value in (OPENAI, GH, AWS, SLACK):
            self.assertEqual(cats(f"token {value} here"), ["api_key"], value[:4])

    def test_jwt(self):
        self.assertEqual(cats(f"Authorization: {JWT}"), ["jwt"])

    def test_bearer(self):
        self.assertEqual(cats(j("Bear", "er ", FILL, "xyz")), ["api_key"])

    def test_bearer_survives_ocr_lookalike_letter(self):
        self.assertEqual(cats(j("Bear", "er ", "\u0430", FILL, "xyz")), ["api_key"])  # Cyrillic a inside the token

    def test_private_key_header(self):
        self.assertEqual(cats(j("-----BEGIN ", "RSA PRIVATE", " KEY-----")), ["api_key"])

    def test_long_hex_and_git_sha(self):
        self.assertEqual(cats("secret " + "a1" * 20 + "ff"), ["long_secret"])  # 42 hex characters
        self.assertEqual(cats("commit " + "a1b2c3d4e5" * 4), [])  # exactly 40 hex: a git commit id

    def test_long_base64_needs_entropy_and_mixed_classes(self):
        self.assertEqual(cats(j(FILL, "Yk8", "Wq4Lm2Tz7Xc9Vb3N")), ["long_secret"])
        self.assertEqual(cats("x" * 45), [])
        self.assertEqual(cats("Documentation" * 4), [])

    def test_ordinary_prose_and_urls_are_clean(self):
        self.assertEqual(cats("we talk about vibe editing and the new model on x.com/home today"), [])
        self.assertEqual(cats("https://example.org/blog/2026/11/some-very-long-article-title-for-the-show"), [])


class EnvLines(unittest.TestCase):
    def test_secret_named_key_is_high(self):
        (m, _), = d.scan_line(j("OPENAI_API", "_KEY=", "abcd1234efgh"), d.Rules())
        self.assertEqual((m.category, m.severity), ("env_line", "high"))

    def test_plain_key_value_is_low(self):
        (m, _), = d.scan_line("NEXT_PUBLIC_SITE=my-site-name", d.Rules())
        self.assertEqual((m.category, m.severity), ("env_line", "low"))

    def test_export_prefix_and_quotes(self):
        self.assertEqual(cats('export DB_PASSWORD="hunter2hunter2"'), ["env_line"])

    def test_trivial_values_ignored(self):
        self.assertEqual(cats("DEBUG=true"), [])
        self.assertEqual(cats("PORT=3000"), [])

    def test_key_with_secret_value_reports_one_hit(self):
        self.assertEqual(cats(j("STRIPE_KEY=", OPENAI)), ["api_key"])  # overlapping matches collapse, specific wins


class Personal(unittest.TestCase):
    def test_email(self):
        self.assertEqual(cats("write to someone@example.net please"), ["email"])

    def test_phones(self):
        self.assertEqual(cats("call +33 6 12 34 56 78"), ["phone"])
        self.assertEqual(cats("call (415) 555-0132"), ["phone"])
        self.assertEqual(cats("tel 06 12 34 56 78"), ["phone"])

    def test_counts_and_versions_are_not_phones(self):
        self.assertEqual(cats("12.5K views 3,400 likes v1.2.3 at 10:30"), [])

    def test_card_needs_luhn(self):
        self.assertEqual(cats(f"card {CARD}"), ["card"])
        self.assertEqual(cats("card 4111 1111 1111 1112"), [])

    def test_iban_needs_checksum(self):
        self.assertEqual(cats(f"iban {IBAN}"), ["iban"])
        self.assertEqual(cats("iban GB82 WEST 1234 5698 7654 33"), [])

    def test_home_paths(self):
        self.assertEqual(cats("cd /Users/someone/projects/app"), ["home_path"])
        self.assertEqual(cats("/home/dev/.ssh/config"), ["home_path"])
        self.assertEqual(cats(j("C:", "\\Users\\", "someone\\Desktop")), ["home_path"])


class Urls(unittest.TestCase):
    def test_query_secret(self):
        self.assertEqual(cats("open https://app.example.net/cb?access_token=" + FILL), ["url_secret"])

    def test_userinfo(self):
        self.assertEqual(cats("postgres://u:p@db.example.net/x"), ["url_secret"])
        self.assertEqual(cats("https://user:pa55word@host.example.net/x"), ["url_secret"])

    def test_plain_query_is_fine(self):
        self.assertEqual(cats("https://example.org/search?q=vibe+editing&page=2"), [])


class Lists(unittest.TestCase):
    def test_denylist_whole_word_case_insensitive(self):
        rules = d.Rules(denylist=["Example Client Inc", "project falcon"])
        self.assertEqual(cats("meeting with EXAMPLE CLIENT INC tomorrow", rules), ["denylist"])
        self.assertEqual(cats("the Project Falcon roadmap", rules), ["denylist"])
        self.assertEqual(cats("the Project Falconry roadmap", rules), [])

    def test_denylist_regex_and_host(self):
        rules = d.Rules(denylist=["re:acme-[a-z]+-staging", "internal-tool.example.invalid"])
        self.assertEqual(cats("deploy to acme-web-staging now", rules), ["denylist"])
        self.assertEqual(cats("https://internal-tool.example.invalid/x", rules), ["denylist"])

    def test_denylist_hit_never_carries_the_entry_name(self):
        rules = d.Rules(denylist=["Secret Client"])
        (m, _), = d.scan_line("see Secret Client", rules)
        self.assertEqual(m.rule, "denylist#1")

    def test_allowlist_domain_covers_email_url_and_subdomain(self):
        rules = d.Rules(allowlist=["example.org"])
        self.assertEqual(cats("hello@example.org", rules), [])
        self.assertEqual(cats("hello@mail.example.org", rules), [])
        self.assertEqual(cats("hello@notexample.org", rules), ["email"])
        self.assertEqual(cats("https://docs.example.org/x?token=" + FILL, rules), [])

    def test_allowlist_exact_suffix_prefix_regex(self):
        self.assertEqual(cats("ok@example.net", d.Rules(allowlist=["ok@example.net"])), [])
        self.assertEqual(cats("a@team.example.net", d.Rules(allowlist=["@team.example.net"])), [])
        self.assertEqual(cats("/Users/shared/media", d.Rules(allowlist=["/Users/shared"])), [])
        self.assertEqual(cats("support@example.net", d.Rules(allowlist=["re:^support@"])), [])

    def test_allowlist_beats_denylist(self):
        rules = d.Rules(denylist=["example.org"], allowlist=["example.org"])
        self.assertEqual(cats("example.org", rules), [])

    def test_parse_config_lines(self):
        text = "# comment\n\n  one  \ntwo # trailing\nre:^x$\n"
        self.assertEqual(d.parse_config_lines(text), ["one", "two", "re:^x$"])


class Boxes(unittest.TestCase):
    TOKENS = [{"start": 0, "end": 4, "box": [10, 20, 40, 12]}, {"start": 5, "end": 9, "box": [60, 22, 50, 12]},
              {"start": 10, "end": 14, "box": [120, 20, 30, 14]}]

    def test_span_box_unions_overlapping_tokens(self):
        self.assertEqual(d.span_box(self.TOKENS, 5, 14, [0, 0, 1, 1]), [60, 20, 90, 14])

    def test_span_box_falls_back_to_line(self):
        self.assertEqual(d.span_box([], 0, 3, [5, 6, 7, 8]), [5, 6, 7, 8])


def hit(t, cat="api_key", sev="high", box=(100, 100, 200, 20)):
    return {"time": t, "category": cat, "severity": sev, "box": list(box)}


class Ranges(unittest.TestCase):
    def test_merge_joins_close_hits_and_counts(self):
        r = d.merge_ranges([hit(10), hit(11), hit(12, "email", "medium"), hit(30)], pad=1.0, gap=1.0)
        self.assertEqual([(x["start"], x["end"], x["hits"]) for x in r], [(9.0, 13.0, 3), (29.0, 31.0, 1)])
        self.assertEqual(r[0]["categories"], {"api_key": 2, "email": 1})
        self.assertEqual(r[0]["severity"], "high")

    def test_gap_keeps_ranges_apart(self):
        r = d.merge_ranges([hit(10), hit(14)], pad=1.0, gap=1.0)
        self.assertEqual(len(r), 2)
        self.assertEqual(len(d.merge_ranges([hit(10), hit(14)], pad=1.0, gap=2.5)), 1)

    def test_clipped_to_duration_and_zero(self):
        r = d.merge_ranges([hit(0.2), hit(59.8)], pad=1.0, gap=0.0, duration=60.0)
        self.assertEqual([(x["start"], x["end"]) for x in r], [(0.0, 1.2), (58.8, 60.0)])

    def test_empty(self):
        self.assertEqual(d.merge_ranges([], 1.0, 1.0), [])

    def test_several_hits_at_the_same_time(self):
        # Regression: equal start times used to make sorted() compare the hit dicts.
        r = d.merge_ranges([hit(5, "email", "medium"), hit(5), hit(5, "path", "low")], 1.0, 1.0)
        self.assertEqual([(x["start"], x["end"], x["hits"]) for x in r], [(4.0, 6.0, 3)])

    def test_severity_rises_to_max(self):
        r = d.merge_ranges([hit(5, sev="low"), hit(6, sev="medium")], 1.0, 1.0)
        self.assertEqual(r[0]["severity"], "medium")


class Regions(unittest.TestCase):
    def test_same_box_over_time_is_one_region(self):
        regs = d.track_boxes([hit(1), hit(2), hit(3)], pad=1.0, gap=1.0)
        self.assertEqual(len(regs), 1)
        self.assertEqual((regs[0]["start"], regs[0]["end"]), (0.0, 4.0))

    def test_scrolling_text_grows_one_region(self):
        regs = d.track_boxes([hit(1, box=(100, 100, 200, 20)), hit(2, box=(100, 110, 200, 20))], 1.0, 1.0)
        self.assertEqual([r["box"] for r in regs], [[100, 100, 200, 30]])

    def test_different_places_stay_separate(self):
        regs = d.track_boxes([hit(1), hit(1, box=(900, 600, 100, 20))], 1.0, 1.0)
        self.assertEqual(len(regs), 2)

    def test_long_gap_starts_a_new_region(self):
        self.assertEqual(len(d.track_boxes([hit(1), hit(20)], 1.0, 1.0)), 2)


class Blur(unittest.TestCase):
    REG = [{"start": 4.0, "end": 9.5, "box": [101, 51, 300, 21], "categories": ["api_key"]}]

    def test_pad_box_even_and_clipped(self):
        self.assertEqual(d.pad_box([101, 51, 300, 21], 8, 1920, 1080), [92, 42, 318, 38])
        self.assertEqual(d.pad_box([0, 0, 10, 10], 8, 1920, 1080), [0, 0, 18, 18])
        x, y, w, h = d.pad_box([1900, 1070, 20, 10], 8, 1920, 1080)
        self.assertLessEqual(x + w, 1920)
        self.assertLessEqual(y + h, 1080)

    def test_filter_has_crop_blur_overlay_with_time_window(self):
        f = d.blur_filter(self.REG, 1920, 1080)
        self.assertIn("crop=318:38:92:42", f)
        self.assertIn("boxblur=luma_radius=8", f)
        self.assertIn("enable='between(t,4.0,9.5)'", f)
        self.assertTrue(f.startswith("[0:v]split") and f.endswith("[vout]"))

    def test_filter_chains_multiple_regions(self):
        f = d.blur_filter(self.REG * 2, 1920, 1080)
        self.assertIn("[v1]split", f)
        self.assertEqual(f.count("overlay="), 2)

    def test_no_regions_is_a_passthrough(self):
        self.assertEqual(d.blur_filter([], 1920, 1080), "[0:v]null[vout]")

    def test_csv_rows(self):
        self.assertEqual(d.blur_csv(self.REG, 1920, 1080).splitlines(),
                         ["start,end,x,y,w,h,categories", "4.0,9.5,92,42,318,38,api_key"])


class Misc(unittest.TestCase):
    def test_timecode(self):
        self.assertEqual(d.timecode(0), "00:00:00.0")
        self.assertEqual(d.timecode(3725.46), "01:02:05.5")
        self.assertEqual(d.timecode(59.96), "00:01:00.0")

    def test_luhn_and_iban_helpers(self):
        self.assertTrue(d.luhn_ok("4111111111111111"))
        self.assertFalse(d.luhn_ok("4111111111111112"))
        self.assertTrue(d.iban_ok(IBAN))
        self.assertFalse(d.iban_ok("GB00"))


if __name__ == "__main__":
    unittest.main()
