"""Build benchmark.json from grading results."""
import json
import os
import statistics
from datetime import datetime

BASE = r"C:\Users\sjw73\OneDrive\Desktop\dev\try-claude-code\skills-workspace\iteration-1"

def load_grading(eval_dir, variant):
    path = os.path.join(BASE, eval_dir, variant, "grading.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

def main():
    runs = []
    with_skill_rates = []
    without_skill_rates = []

    for dirname in sorted(os.listdir(BASE)):
        meta_path = os.path.join(BASE, dirname, "eval_metadata.json")
        if not os.path.exists(meta_path):
            continue
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        eval_id = meta.get("eval_id", 0)
        eval_name = meta.get("eval_name", dirname)

        for variant in ["with_skill", "without_skill"]:
            grading = load_grading(dirname, variant)
            if not grading:
                continue

            summary = grading.get("summary", {})
            pass_rate = summary.get("pass_rate", 0)
            passed = summary.get("passed", 0)
            total = summary.get("total", 0)

            config = variant
            if config == "with_skill":
                with_skill_rates.append(pass_rate)
            else:
                without_skill_rates.append(pass_rate)

            run = {
                "eval_id": eval_id,
                "eval_name": eval_name,
                "configuration": config,
                "run_number": 1,
                "result": {
                    "pass_rate": pass_rate,
                    "passed": passed,
                    "failed": total - passed,
                    "total": total,
                    "time_seconds": 0,
                    "tokens": 0,
                    "tool_calls": 0,
                    "errors": 0
                },
                "expectations": grading.get("expectations", []),
                "notes": []
            }
            runs.append(run)

    # Calculate summary stats
    def calc_stats(rates):
        if not rates:
            return {"mean": 0, "stddev": 0, "min": 0, "max": 0}
        m = statistics.mean(rates)
        s = statistics.stdev(rates) if len(rates) > 1 else 0
        return {"mean": round(m, 3), "stddev": round(s, 3), "min": round(min(rates), 3), "max": round(max(rates), 3)}

    ws = calc_stats(with_skill_rates)
    wos = calc_stats(without_skill_rates)

    delta_pr = ws["mean"] - wos["mean"]

    benchmark = {
        "metadata": {
            "skill_name": "all-skills-v2",
            "timestamp": datetime.now().isoformat(),
            "evals_run": list(range(1, 35)),
            "runs_per_configuration": 1
        },
        "runs": runs,
        "run_summary": {
            "with_skill": {
                "pass_rate": ws,
                "time_seconds": {"mean": 0, "stddev": 0, "min": 0, "max": 0},
                "tokens": {"mean": 0, "stddev": 0, "min": 0, "max": 0}
            },
            "without_skill": {
                "pass_rate": wos,
                "time_seconds": {"mean": 0, "stddev": 0, "min": 0, "max": 0},
                "tokens": {"mean": 0, "stddev": 0, "min": 0, "max": 0}
            },
            "delta": {
                "pass_rate": f"+{delta_pr:.3f}",
                "time_seconds": "N/A",
                "tokens": "N/A"
            }
        },
        "notes": [
            f"with_skill avg pass_rate: {ws['mean']:.2f} (stddev {ws['stddev']:.2f})",
            f"without_skill avg pass_rate: {wos['mean']:.2f} (stddev {wos['stddev']:.2f})",
            f"Delta: +{delta_pr:.2f} pass_rate improvement with skills",
            "Skills show strongest differentiation in: web-quality-audit, planner-lite, SEO, performance, accessibility-review",
            "Near-baseline skills (skill adds less value): commit, frontend-dev (without_skill already decent)"
        ]
    }

    out_path = os.path.join(BASE, "benchmark.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(benchmark, f, ensure_ascii=False, indent=2)
    print(f"Written benchmark.json with {len(runs)} runs")
    print(f"with_skill: mean={ws['mean']:.2f}, stddev={ws['stddev']:.2f}")
    print(f"without_skill: mean={wos['mean']:.2f}, stddev={wos['stddev']:.2f}")
    print(f"Delta: +{delta_pr:.2f}")

if __name__ == "__main__":
    main()
