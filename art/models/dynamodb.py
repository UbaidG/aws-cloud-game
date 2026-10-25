"""Amazon DynamoDB: a fast key-value table column with a lightning core."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


BOLT = [(-0.04, 0.16), (0.07, 0.16), (0.02, 0.03), (0.08, 0.03), (-0.05, -0.17), (-0.01, -0.02), (-0.07, -0.02)]


def build():
    m = Model("dynamodb", accent="#527FFF")
    base = m.plinth()
    z = base
    m.cyl(0.42, 0.08, (0, 0, z + 0.04), "steel", verts=8, bevel=0.02)
    # Partition rings stacked into a column.
    for i in range(5):
        cz = z + 0.12 + i * 0.16
        m.cyl(0.32, 0.13, (0, 0, cz + 0.065), "accent" if i % 2 == 0 else "accent_dark", verts=8, bevel=0.02)
        m.cyl(0.325, 0.012, (0, 0, cz + 0.135), "accent_glow", verts=8, bevel=0)
    top = z + 0.12 + 5 * 0.16
    m.cyl(0.34, 0.04, (0, 0, top + 0.02), "steel_light", verts=8, bevel=0.012)
    # Lightning bolt on the front.
    m.prism([(x * 1.6, y * 1.6) for x, y in BOLT], 0.04, (0, -0.33, z + 0.52), "white", bevel=0.008)
    m.badge((0, -0.42, z + 0.04), size=0.07)
    m.socket("status", (0, 0, top + 0.25))
    m.socket("label", (0, 0, top + 0.2))
    return m


if __name__ == "__main__":
    run(build)
