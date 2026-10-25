"""Amazon ECS: shipping containers stacked on a dock."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def container(m, x, y, z, mat, w=0.46, d=0.3, h=0.26, rot=0):
    m.box((w, d, h), (x, y, z + h / 2), mat, bevel=0.012, rot=(0, 0, rot))
    # Corrugated ribs and door frame.
    c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    for i in range(7):
        off = -w / 2 + 0.04 + i * (w - 0.08) / 6
        m.box((0.018, d + 0.012, h - 0.04), (x + off * c, y + off * s, z + h / 2), "accent_dark" if mat == "accent" else "steel", bevel=0, rot=(0, 0, rot))
    m.box((w + 0.01, d + 0.01, 0.02), (x, y, z + h - 0.005), "steel_light", bevel=0.004, rot=(0, 0, rot))


def build():
    m = Model("ecs", accent="#ED7100")
    base = m.plinth()
    m.box((1.0, 0.8, 0.08), (0, 0, base + 0.04), "steel", bevel=0.02)
    z = base + 0.08
    container(m, -0.22, -0.18, z, "accent")
    container(m, 0.25, -0.18, z, "white")
    container(m, 0.0, 0.2, z, "steel_light", w=0.6)
    container(m, -0.05, -0.05, z + 0.26, "accent", rot=8)
    container(m, 0.2, 0.18, z + 0.26, "white", w=0.36)
    # Crane post.
    m.box((0.06, 0.06, 0.9), (0.44, 0.33, z + 0.45), "accent_dark", bevel=0.01)
    m.box((0.5, 0.05, 0.05), (0.22, 0.33, z + 0.88), "accent_dark", bevel=0.01)
    m.tube([(0.05, 0.33, z + 0.86), (0.05, 0.33, z + 0.7)], 0.006, "cable")
    m.badge((-0.22, -0.34, z + 0.13), size=0.16)
    m.socket("status", (0, 0, z + 1.05))
    m.socket("label", (0, 0, z + 1.0))
    return m


if __name__ == "__main__":
    run(build)
