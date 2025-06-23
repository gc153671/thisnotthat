from anywidget import AnyWidget
from collections.abc import Hashable
from dataclasses import dataclass, field
import glasbey
import ipywidgets as wg
from jscatter import Scatter
import pandas as pd
from pathlib import Path
import traitlets as tl
from typing import Any, Generic, Protocol, Type, TypeVar
from typing_extensions import Self


Label = Hashable
T = TypeVar("T")
ObjSimple = dict[str, str | float | int | bool | None]


def _raw_label_meta(
    name: str,
    color: str,
    propn_selected: float = 0.
) -> ObjSimple:
    return {"name": name, "color": color, "propn_selected": propn_selected}


@dataclass
class _ProxyGet:
    _entry: ObjSimple

    def __repr__(self) -> str:
        return repr(self._entry)

    def __getattr__(self, name: str) -> str | float:
        return self._entry[name]


# @dataclass
# class _ProxyGet(Generic[T]):
#     _value: T

#     def __repr__(self) -> str:
#         return repr(self._value)

#     def __getattr__(self, name: str) -> T:
#         return getattr(self._value, name)


class _Cloneable(Protocol):

    def clone(self) -> Self:
        ...


class _ProxySet(Generic[T]):

    def __init__(self, source: dict[Label, ObjSimple], key: Label) -> None:
        self.__dict__["_source"] = source
        self.__dict__["_label"] = label

    def __setattr__(self, attr: str, value: T) -> None:
        if attr not in self.__dict__:
            new_meta = {k: v for k, v in self._source[self._label].items()}
            new_meta[attr] = value
            self._source[self._label] = new_meta


@dataclass
class Labels:
    _source: dict[Label, ObjSimple] = field(default_factory=dict)

    def __getitem__(self, label: Label) -> _ProxyGet:
        return _ProxyGet(self._dict[label])

    def set(self, label: Label) -> _ProxySet:
        return _ProxySet(self, label)


class LabelEditor(AnyWidget):
    _esm = Path(__file__).parent / "label_editor.js"
    _css = Path(__file__).parent / "label_editor.css"

    labels = tl.Any().tag(sync=True)


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
            labels={name: _raw_label_meta(str(name), color) for name, color in color_map.items()}
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

    def labels(self, column: str) -> dict[Hashable, str]:
        return Labels(_source=self._editor.labels)


__all__ = [
    "Dashboard",
    "LabelEditor",
    "Labels",
]