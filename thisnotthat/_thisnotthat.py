from anywidget import AnyWidget
from collections.abc import Hashable, Iterable, Iterator
from copy import copy
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
        return label == -1.0 or np.isnan(label)
    if isinstance(label, str):
        return label == "-1" or not bool(label)
    return False


class LabelEditor(AnyWidget):
    _esm = Path(__file__).parent / "label_editor.js"
    _css = Path(__file__).parent / "label_editor.css"

    _labels = tl.List().tag(sync=True)
    _names = tl.Dict().tag(sync=True)
    _colors = tl.Dict().tag(sync=True)
    _propn_selected = tl.Dict().tag(sync=True)
    _select_counters = tl.Dict().tag(sync=True)

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
            _select_counters={str(label): 0 for label in labels_u},
        )

    @property
    def labels(self) -> LabelDict:
        return LabelDict(self)

    def color_map(self) -> dict[Label, str]:
        return {label: self._colors[str(label)] for label in self._labels}


Palette = list[str]
COLOR_UNLABELLED = "#cccccc"


class InteractiveLegend:

    class Categorical(AnyWidget):
        _esm = Path(__file__).parent / "js" / "legend" / "categorical.js"
        _css = Path(__file__).parent / "css" / "legend" / "categorical.css"

        _minPixelsPerItem = tl.Int().tag(sync=True)
        _textHeight = tl.Int().tag(sync=True)
        _widthColorBar = tl.Int().tag(sync=True)
        _colorUnlabelled = tl.Unicode().tag(sync=True)
        _nameUnlabelled = tl.Unicode().tag(sync=True)
        _data = tl.Dict().tag(sync=True)
        _names = tl.Dict().tag(sync=True)
        _palette = tl.List().tag(sync=True)
        _colors = tl.Dict().tag(sync=True)
        _num_selected = tl.Int().tag(sync=True)

        @classmethod
        def make(
            cls,
            data: pd.Series,
            palette: Palette = [COLOR_UNLABELLED],
            min_pixels_per_item: int = 24,
            text_height: int = 12,
            width_color_bar: int = 30,
            color_unlabelled: str = COLOR_UNLABELLED,
            name_unlabelled: str = "<Uncategorized>"
        ) -> Self:
            return cls(
                _minPixelsPerItem=min_pixels_per_item,
                _textHeight=text_height,
                _widthColorBar=width_color_bar,
                _colorUnlabelled=color_unlabelled,
                _nameUnlabelled=name_unlabelled,
                _data=data.to_dict(),
                _names={},
                _palette=glasbey.extend_palette(palette, data.nunique(dropna=False)),
                _colors={},
                _num_selected=0,
            )

        def color_map_minimal(self) -> dict[Label, str]:
            color_map = {}
            if self._colors:
                data = pd.Series(self._data)
                labels = data.value_counts()
                color_map = {}
                for color in labels.index:
                    if labels.loc[color] > 0:
                        color_map[color] = self._colors[str(color)]
            else:
                labels = sorted(
                    set(self._data.values()),
                    key=lambda x: (not is_label_noise(x), str(x))
                )
                palette = copy(self._palette)
                if not is_label_noise(labels[0]) and palette[0] == self._colorUnlabelled:
                    del palette[0]
                color_map = dict(zip(labels, palette))
            return color_map


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
        self._setup()

    def _setup(self):
        column_x = "x"
        column_y = "y"
        column_labels = "label"

        # self._editor = LabelEditor.make(self._dataset.df[column_labels])
        self._editor = InteractiveLegend.Categorical.make(self._dataset.df[column_labels])
        self._dataset.sources[column_labels] = self._editor
        self._scatter = Scatter(
            data=self._dataset.df,
            x=column_x,
            y=column_y,
            color_by=column_labels,
            color_map=self._editor.color_map_minimal(),
            height=self._height,
        )

        def on_color_change(_change):
            self._scatter.color(map=self._editor.color_map_minimal())

        self._editor.observe(on_color_change, ["_colors"])

        # def on_new_selection(_change):
        #     is_selected = np.zeros((self._dataset.df.shape[0],), dtype=int)
        #     is_selected[self._scatter.selection()] = 1
        #     for label, total, num_selected in (
        #         self._dataset.df[
        #             [column_labels]
        #         ]
        #         .assign(selected=is_selected)
        #         .groupby(column_labels, observed=False)
        #         .agg({"selected": ["count", "sum"]})
        #         .itertuples(index=True)
        #     ):
        #         self._dataset.labels[column_labels][label].propn_selected = (
        #             num_selected / total
        #         )

        # self._scatter.widget.observe(on_new_selection, ["selection"])

        # def on_legend_select(change):
        #     selected = set(self._scatter.selection())
        #     for label, group in (
        #         self._dataset.df
        #         .assign(ii=range(len(self._dataset.df)))[
        #             [column_labels, "ii"]
        #         ]
        #         .groupby(column_labels, observed=False)
        #     ):
        #         if (
        #             change["new"].get(str(label), -1) > change["old"].get(str(label), -1)
        #         ):
        #             items_with_label = set(group["ii"])
        #             if len(
        #                 selected & items_with_label
        #             ) == len(items_with_label):
        #                 selected -= items_with_label
        #             else:
        #                 selected |= items_with_label
        #     self._scatter.selection(list(selected))

        # self._editor.observe(on_legend_select, ["_select_counters"])

    def show(self) -> wg.Widget:
        self._scatter.height = self._height
        sw = self._scatter.show()
        sw.height = self._height
        sw.layout.flex = "6 1 auto"
        sw.layout.height = "100%"
        self._editor.layout.flex = "1 0 auto"
        self._editor.layout.min_width = "1in"
        self._editor.layout.max_width = "2.5in"
        self._editor.layout.margin = "0px 5px 0px 0px"
        hbox = wg.HBox(
            children=[self._editor, sw],
            layout=wg.Layout(
                display="flex",
                flex_flow="row wrap",
                align_items="stretch",
                align_content="stretch",
                height=f"{self._height + 25}px",
            )
        )
        return hbox


__all__ = [
    "Dashboard",
    "Dataset",
    "LabelDict",
    "LabelEditor",
    "LabelMeta",
]
