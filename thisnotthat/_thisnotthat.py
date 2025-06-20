from anywidget import AnyWidget
import glasbey
import ipywidgets as wg
from jscatter import Scatter
import pandas as pd
from pathlib import Path
import traitlets as tl


def _label(name: str, color: str) -> dict[str, str]:
    return {"name": name, "color": color}


class LabelEditor(AnyWidget):
    _esm = Path(__file__).parent / "label_editor.js"
    _css = Path(__file__).parent / "label_editor.css"

    labels = tl.List(trait=tl.Dict, default_value=[{"heyhey": "hoho"}]).tag(sync=True)


class Dashboard:

    def __init__(
        self,
        dataset: pd.DataFrame,
        height: int = 400
    ) -> None:
        self._dataset = dataset
        self._height = height
        column_x = "x"
        column_y = "y"
        column_labels = "label"
        assert isinstance(dataset[column_labels].dtype, pd.CategoricalDtype)

        labels_u = sorted(self._dataset[column_labels].unique())
        color_map = {
            label: color
            for label, color in zip(
                labels_u,
                glasbey.extend_palette(["#dddddd"], len(labels_u))
            )
        }

        self._scatter = Scatter(
            data=self._dataset,
            x=column_x,
            y=column_y,
            color_by=column_labels,
            color_map=color_map,
            height=self._height,
        )
        self._editor = LabelEditor(
            labels=[_label(name, color) for name, color in color_map.items()]
        )

    def show(self) -> wg.Widget:
        self._scatter.height = self._height
        sw = self._scatter.show()
        sw.height = self._height
        sw.layout.flex = "4 1 auto"
        self._editor.layout.flex = "1 0 auto"
        self._editor.layout.min_width = "1in"
        self._editor.layout.max_width = "2.5in"
        hbox = wg.HBox(
            children=[self._editor, sw],
            layout=wg.Layout(
                display="flex",
                flex_flow="row wrap",
                align_items="stretch",
                align_content="stretch",
                height=f"{self._height}px",
            )
        )
        return hbox


__all__ = [
    "Dashboard",
    "LabelEditor",
]