from anywidget import AnyWidget
from collections.abc import Hashable, Iterable, Iterator
from dataclasses import dataclass, field
import glasbey
import ipywidgets as wg
from jscatter import Scatter
import numpy as np
import pandas as pd
from pathlib import Path
import traitlets as tl
from typing import cast
from typing_extensions import Self

Label = Hashable
LabelAttribute = str | float | int | bool | None


@dataclass
class LabelMeta:
    _editor: "LabelEditor"
    _label: Label

    def _get(self, name: str) -> LabelAttribute:
        return getattr(self._editor, name).get(str(self._label), None)

    def _set(self, name: str, value: LabelAttribute):
        new_dict = {k: v for k, v in getattr(self._editor, name).items()}
        new_dict[str(self._label)] = value
        setattr(self._editor, name, new_dict)

    @property
    def name(self) -> str:
        return cast(str, self._get("_names"))

    @name.setter
    def name(self, value: str) -> None:
        self._set("_names", value)

    @property
    def color(self) -> str:
        return cast(str, self._get("_colors"))

    @color.setter
    def color(self, value: str) -> None:
        self._set("_colors", value)

    @property
    def propn_selected(self) -> float:
        return cast(float, self._get("_propn_selected"))

    @propn_selected.setter
    def propn_selected(self, value: float) -> None:
        self._set("_propn_selected", value)

    def __repr__(self) -> str:
        return ", ".join(
            [
                f"<Name: {self.name}",
                f"Color: {self.color}",
                f"Proportion selected: {self.propn_selected:.3f}>"
            ]
        )


class LabelDict:

    def __init__(self, editor: "LabelEditor") -> None:
        self._editor = editor

    def __repr__(self) -> str:
        return f"{{{', '.join(str(label) + ': ' + repr(self[label]) for label in self.keys())}}}"

    def keys(self) -> Iterator[Label]:
        return iter(self._editor._labels)

    def __getitem__(self, key: Label) -> LabelMeta:
        return LabelMeta(self._editor, key)


def is_label_noise(label: Label) -> bool:
    if isinstance(label, int):
        return label == -1
    if isinstance(label, float):
        return np.isnan(label)
    if isinstance(label, str):
        return bool(label)
    return False


class LabelEditor(AnyWidget):
    _esm = Path(__file__).parent / "label_editor.js"
    _css = Path(__file__).parent / "label_editor.css"

    _labels = tl.List().tag(sync=True)
    _names = tl.Dict().tag(sync=True)
    _colors = tl.Dict().tag(sync=True)
    _propn_selected = tl.Dict().tag(sync=True)

    @classmethod
    def make(cls, labels: Iterable[Label]) -> Self:
        labels_tagged = [(not is_label_noise(label), label) for label in set(labels)]
        num_labels = 1 + sum(int(is_ordinary) for is_ordinary, _ in labels_tagged)
        labels_u = [label for _, label in sorted(labels_tagged)]
        palette = glasbey.extend_palette(["#dddddd"], num_labels)
        return cls(
            _labels=labels_u,
            _names={str(label): str(label) for label in labels_u},
            _colors={str(label): color for label, color in zip(labels_u, palette)},
            _propn_selected={str(label): 0. for label in labels_u},
        )

    @property
    def labels(self) -> LabelDict:
        return LabelDict(self)

    def color_map(self) -> dict[Label, str]:
        return {label: self._colors[str(label)] for label in self._labels}


@dataclass
class Dataset:
    df: pd.DataFrame
    sources: dict[str, LabelEditor] = field(default_factory=dict)

    @property
    def labels(self) -> dict[str, LabelDict]:
        return {
            column: editor.labels
            for column, editor in self.sources.items()
        }


class Dashboard:

    def __init__(
        self,
        dataset: Dataset,
        height: int = 400
    ) -> None:
        self._dataset = dataset
        self._height = height
        column_x = "x"
        column_y = "y"
        column_labels = "label"
        assert isinstance(
            dataset.df[column_labels].dtype,
            pd.CategoricalDtype
        )

        self._editor = LabelEditor.make(self._dataset.df[column_labels])
        self._dataset.sources[column_labels] = self._editor
        self._scatter = Scatter(
            data=self._dataset.df,
            x=column_x,
            y=column_y,
            color_by=column_labels,
            color_map=self._editor.color_map(),
            height=self._height,
        )

        def on_color_change(_change):
            self._scatter.color(map=self._editor.color_map())

        self._editor.observe(on_color_change, ["_colors"])

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

    def labels(self, column: str) -> dict[Hashable, str]:
        return Labels(_source=self._editor.labels)


__all__ = [
    "Dashboard",
    "Dataset",
    "LabelDict",
    "LabelEditor",
    "LabelMeta",
]
