from anywidget import AnyWidget
from collections.abc import Hashable, Iterable, Iterator, Mapping
from copy import copy
from dataclasses import dataclass, field
import glasbey
import ipywidgets as wg
from jscatter import Scatter
import numpy as np
import pandas as pd
from pathlib import Path
import traitlets as tl
from typing import Any, cast
from typing_extensions import Self

LABEL_UNCAT = "<Uncategorized>"
Categorical = Hashable
Label = Categorical


def is_value_uncat(label: Label) -> bool:
    if label is None:
        return True
    if isinstance(label, int):
        return label == -1
    if isinstance(label, float):
        return label == -1.0 or np.isnan(label)
    if isinstance(label, str):
        return label == "-1" or not bool(label)
    return False


def normalize_categorical(value: Any) -> Label:
    if is_value_uncat(value):
        return LABEL_UNCAT
    return str(value)


Color = str
Palette = list[Color]
ColorMap = Mapping[Categorical, Color]
COLOR_UNLABELLED = "#cccccc"
PALETTE_DEFAULT = glasbey.extend_palette([COLOR_UNLABELLED])


class LabelEditor(AnyWidget):

    color_uncat = tl.Unicode(default_value=COLOR_UNLABELLED).tag(sync=True)
    name_uncat = tl.Unicode(default_value=LABEL_UNCAT).tag(sync=True)
    size_font = tl.Int(default_value=12).tag(sync=True)
    width_color_bar = tl.Int(default_value=30).tag(sync=True)
    space_color_bar_info = tl.Int(default_value=5).tag(sync=True)
    palette_cats = tl.List(default_value=[]).tag(sync=True)

    labels = tl.List(default_value=[]).tag(sync=True)
    names = tl.Dict(default_value={}).tag(sync=True)
    colors = tl.Dict(default_value={}).tag(sync=True)
    propn_selected = tl.Dict(default_value={}).tag(sync=True)
    label_assigned = tl.Unicode(default_value="").tag(sync=True)

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        if not self.palette_cats:
            self.palette_cats = glasbey.extend_palette([self.color_uncat], 257)[1:]

    def color_map(self, data: pd.Series) -> ColorMap:
        raise NotImplementedError("Override this")
        return "#000000"

    def edit(self, data: pd.Series, selection: list[int]) -> pd.Series:
        raise NotImplementedError("Override this")
        return data


class CategoricalEditor(LabelEditor):

    _esm = Path(__file__).parent / "js" / "legend" / "categorical.js"
    _css = Path(__file__).parent / "css" / "legend" / "categorical.css"

    min_height_item = tl.Int(default_value=24).tag(sync=True)

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        self.labels = [LABEL_UNCAT, *sorted([label for label in self.labels if label != LABEL_UNCAT])]
        if len(self.palette_cats) < len(self.labels) - 1:
            if palette_cats in kwargs:
                raise ValueError(
                    f"We must assign a color to {len(self.labels) - 1} categorical labels, "
                    f"but palette_cats only has {len(self.palette_cats)} distinct colours."
                )
            else:
                self.palette_cats = glasbey.extend_paeltte(
                    [self.color_uncat],
                    2 * len(self.labels)
                )
        self.names = {cat: cat for cat in self.labels}
        self.colors = {cat: color for cat, color in zip(self.labels, [self.color_uncat, *self.palette_cats])}
        self.propn_selected = {cat: 0. for cat in self.labels}

    def color_map(self, data: pd.Series) -> ColorMap:
        return {
            x: self.colors.get(x) or self.color_uncat
            for x in data.unique()
        }

    def edit(self, data: pd.Series, selection: list[int]) -> pd.Series:
        data_mod = data.copy()
        data_mod.iloc[selection] = self.label_assigned
        self.label_assigned = ""
        return data_mod


class Dataset:

    def __init__(self, source: pd.DataFrame) -> None:
        columns = []
        for name_column in source.columns:
            column = source[name_column]
            match column.dtype:
                case "float":
                    columns.append(column)
                case "object" | "str" | "category":
                    columns.append(column.map(normalize_categorical).astype(str))
                case _:
                    raise RuntimeError(f"Meeting column {column.dtype} for the first time")
        self.df = pd.concat(columns, axis="columns").assign(_dummy=0.)


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

        self._editor = CategoricalEditor(labels=list(self._dataset.df[column_labels].unique()))
        self._scatter = Scatter(
            data=self._dataset.df,
            x=column_x,
            y=column_y,
            color_by=column_labels,
            color_map=self._editor.color_map(self._dataset.df[column_labels]),
            height=self._height,
        )

        def on_color_change(_change):
            self._scatter.color(map=self._editor.color_map(self._dataset.df[column_labels]))

        self._editor.observe(on_color_change, ["colors"])

        def on_new_selection(_change):
            is_selected = np.zeros((self._dataset.df.shape[0],), dtype=int)
            is_selected[self._scatter.selection()] = 1
            self._editor.propn_selected = {
                label: num_selected / total
                for label, total, num_selected in (
                    self._dataset.df[[column_labels]]
                    .assign(selected=is_selected)
                    .groupby(column_labels, observed=False)
                    .agg({"selected": ["count", "sum"]})
                    .itertuples(index=True)
                )
            }

        self._scatter.widget.observe(on_new_selection, ["selection"])

        def on_propn_select(change):
            selection = set(self._scatter.selection())
            for label, group_deindexed in self._dataset.df.reset_index(drop=True).groupby(column_labels):
                propn_new = change["new"].get(label, 0.)
                if propn_new != change["old"].get(label, 0.):
                    if propn_new == 0.:
                        selection -= set(group_deindexed.index)
                    elif propn_new == 1.:
                        selection |= set(group_deindexed.index)
            self._scatter.selection(list(selection))

        self._editor.observe(on_propn_select, ["propn_selected"])

        def on_assign_label(change):
            if change["new"]:
                self._dataset.df[column_labels] = self._editor.edit(self._dataset.df[column_labels], self._scatter.selection())
                self._scatter.color(by="_dummy", map="magma")
                self._scatter.data(
                    data=self._dataset.df,
                    use_index=False,
                )
                self._scatter.color(
                    by=column_labels,
                    map=self._editor.color_map(self._dataset.df[column_labels]),
                )
                on_new_selection(change)

        self._editor.observe(on_assign_label, ["label_assigned"])


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
    "CategoricalEditor",
    "Dashboard",
    "Dataset",
    "LabelEditor",
]
