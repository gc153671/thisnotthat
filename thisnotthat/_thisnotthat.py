from anywidget import AnyWidget
from collections.abc import Hashable, Iterable, Iterator, Mapping, Sequence
from copy import copy
from dataclasses import dataclass, field
import glasbey
import ipywidgets as wg
from jscatter import Scatter
from matplotlib.colors import to_rgba
import numpy as np
import pandas as pd
from pathlib import Path
import traitlets as tl
from typing import Any, cast, Protocol, TypeVar
from typing_extensions import Self

NAME_UNLABELLED = "<Unlabelled>"
Categorical = Hashable
Label = str


def is_value_unlabelled(label: Label) -> bool:
    return str(label).lower() in {
        '', 'nan', 'none', '-1', '-1.0', 'false', NAME_UNLABELLED.lower()
    }


def normalize_categorical(value: Any) -> Label:
    if is_value_unlabelled(value):
        return NAME_UNLABELLED
    return Label(value)


Color = str
Palette = list[Color]
ColorMap = Mapping[Categorical, Color]
COLOR_UNLABELLED = "#cccccc"
PALETTE_DEFAULT = glasbey.extend_palette([COLOR_UNLABELLED])


@dataclass
class MetadataLabel:
    name: str
    index_color: int


@dataclass
class _Reflection:
    name: str


# class Column(Protocol):

#     @property
#     def raw(self) -> pd.Series:
#         ...

#     @property
#     def edited(self) -> pd.Series:
#         ...

#     def edit(self, selection: Sequence[int], new_value: str) -> None:
#         ...


# TypeColumn = TypeVar("TypeColumn", bound=Column)


# @dataclass
# class ColumnNumerical:
#     raw: pd.Series

#     @property
#     def edited(self) -> pd.Series:
#         return self.raw


# class ColumnCategorical:

#     def __init__(self, source) -> None:
#         self.raw = source.map(normalize_categorical).astype(str)
#         self._meta = {
#             label: MetadataLabel(name=label, index_color=i)
#             for i, label in enumerate(
#                 [LABEL_UNCAT, *sorted(set(self.raw) - {LABEL_UNCAT})],
#                 start=-1
#             )
#         }
#         self.edited = self.raw.map(lambda x: (self._meta.get(x) or _Reflection(x)).name)

#     def edit(self, selection: Sequence[int], new_value: str) -> None:
#         self.edited.iloc[selection] = new_value


class LabelEditor(AnyWidget):

    labels = tl.List().tag(sync=True)
    categories = tl.List().tag(sync=True)
    palette = tl.List(default_value=[]).tag(sync=True)
    # color_uncat = tl.Unicode(default_value=COLOR_UNLABELLED).tag(sync=True)
    # name_uncat = tl.Unicode(default_value=NAME_UNLABELLED).tag(sync=True)
    size_font = tl.Int(default_value=12).tag(sync=True)
    width_color_bar = tl.Int(default_value=30).tag(sync=True)
    space_color_bar_info = tl.Int(default_value=5).tag(sync=True)
    selection = tl.List(default_value=[]).tag(sync=True)

    # labels = tl.List(default_value=[]).tag(sync=True)
    # names = tl.Dict(default_value={}).tag(sync=True)
    # colors = tl.Dict(default_value={}).tag(sync=True)
    # propn_selected = tl.Dict(default_value={}).tag(sync=True)
    # label_assigned = tl.Unicode(default_value="").tag(sync=True)

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        if not self.palette:
            # self.palette = glasbey.extend_palette([self.color_uncat], 257)[1:]
            self.palette = [
                to_rgba(c)
                for c in glasbey.extend_palette([to_rgba(COLOR_UNLABELLED)], 256)
            ]

    # def color_map(self, data: pd.Series) -> ColorMap:
    #     raise NotImplementedError("Override this")
    #     return "#000000"

    # def edit(self, column: Column, selection: list[int]) -> None:
    #     column.edit(selection, self.label_assigned)
    #     self.label_assigned = ""


class CategoricalEditor(LabelEditor):

    _esm = Path(__file__).parent / "js" / "legend" / "categorical.js"
    _css = Path(__file__).parent / "css" / "legend" / "categorical.css"

    min_height_item = tl.Int(default_value=24).tag(sync=True)

    # def __init__(self, **kwargs) -> None:
        # super().__init__(**kwargs)
      # self.labels = [LABEL_UNCAT, *sorted([label for label in self.labels if label != LABEL_UNCAT])]
      # if len(self.palette_labels) < len(self.labels) - 1:
      #     if palette_labels in kwargs:
      #         raise ValueError(
      #             f"We must assign a color to {len(self.labels) - 1} categorical labels, "
      #             f"but palette_labels only has {len(self.palette_labels)} distinct colours."
      #         )
      #     else:
      #         self.palette_labels = glasbey.extend_paeltte(
      #             [self.color_uncat],
      #             2 * len(self.labels)
      #         )
      # self.names = {cat: cat for cat in self.labels}
      # self.colors = {cat: color for cat, color in zip(self.labels, [self.color_uncat, *self.palette_labels])}
      # self.propn_selected = {cat: 0. for cat in self.labels}

    # def color_map(self, data: pd.Series) -> ColorMap:
    #     return {
    #         x: self.colors.get(x) or self.color_uncat
    #         for x in data.unique()
    #     }


# class Dataset:

#     def __init__(self, source: pd.DataFrame) -> None:
#         # self.columns = {}
#         self._source = source
#         self._labels = {}
#         for column in self._source:
            

#     def data_plotting(self) -> pd.DataFrame:
#         columns = {}
#         for column in self._source:
#             # self.labels[column] = {}
#             match self._source[column].dtype:
#                 case "float":
#                     self._plotting[column] = source[column]
#                 case "object" | "str" | "category":
#                     self._labels[column] = [
#                         normalize_categorical(v)
#                         for v in source[column]
#                     ]
#                     self._plotting[column] = pd.Series(self._labels[column])
#                 case _:
#                     raise RuntimeError(f"Meeting column {column.dtype} for the first time")
#         return pd.DataFrame(self._plotting, index=self._source.index)

#     # def raw(self):
#     #     return pd.concat(
#     #         [column.raw for column in self.columns.values()],
#     #         axis="columns"
#     #     ).assign(_dummy=0.)

#     # @property
#     # def edited(self):
#     #     return pd.concat(
#     #         [column.edited for column in self.columns.values()],
#     #         axis="columns"
#     #     ).assign(_dummy=0.)
#     #
#     def data_edited(self, suffixes: tuple[str, str] = ("", "_labels")) -> pd.DataFrame:
#         return self._source.merge(
#             pd.DataFrame(self._labels, index=self._source.index),
#             how="left",
#             left_index=True,
#             right_index=True,
#             suffixes=suffixes
#         )


class Dashboard:

    def __init__(
        self,
        data: pd.DataFrame,
        labels: str | list[Label] | dict[Hashable, Label] | pd.Series | None,
        height: int = 400
    ) -> None:
        self._data = data
        self._height = height

        assert labels is not None
        if isinstance(labels, str):
            dict_labels = self._data[labels].to_dict()
        else:
            raise NotImplementedError()

        self._labels = pd.Series(
            {k: normalize_categorical(v) for k, v in dict_labels.items()},
            index=self._data.index
        ).fillna(NAME_UNLABELLED).to_list()
        self._categories = [
            NAME_UNLABELLED,
            *sorted(set(self._labels) - {NAME_UNLABELLED})
        ]
        self._setup()

    @property
    def _labels_cat(self) -> pd.Series:
        return pd.Series(
            pd.Categorical(self._labels, categories=self._categories),
            index=self._data.index
        )

    def _setup(self):
        # TODO: make this configurable
        column_x = "x"
        column_y = "y"

        self._editor = CategoricalEditor(
            labels=self._labels,
            categories=self._categories,
        )
        self._scatter = Scatter(
            data=self._data.assign(__labels__=self._labels_cat),
            x=column_x,
            y=column_y,
            color_by="__labels__",
            # color_map=self._editor.color_map(self._dataset.raw[column_labels]),
            height=self._height,
        )
        self._scatter.widget.color = self._editor.palette

        # def on_color_change(_change):
        #     self._scatter.color(map=self._editor.color_map(self._dataset.raw[column_labels]))

        # self._editor.observe(on_color_change, ["colors"])

        # def on_new_selection(_change):
        #     is_selected = np.zeros((self._dataset.raw.shape[0],), dtype=int)
        #     is_selected[self._scatter.selection()] = 1
        #     self._editor.propn_selected = {
        #         label: num_selected / total
        #         for label, total, num_selected in (
        #             self._dataset.raw[[column_labels]]
        #             .assign(selected=is_selected)
        #             .groupby(column_labels, observed=False)
        #             .agg({"selected": ["count", "sum"]})
        #             .itertuples(index=True)
        #         )
        #     }

        # self._scatter.widget.observe(on_new_selection, ["selection"])

        # def on_propn_select(change):
        #     selection = set(self._scatter.selection())
        #     for label, group_deindexed in self._dataset.raw.reset_index(drop=True).groupby(column_labels):
        #         propn_new = change["new"].get(label, 0.)
        #         if propn_new != change["old"].get(label, 0.):
        #             if propn_new == 0.:
        #                 selection -= set(group_deindexed.index)
        #             elif propn_new == 1.:
        #                 selection |= set(group_deindexed.index)
        #     self._scatter.selection(list(selection))

        # self._editor.observe(on_propn_select, ["propn_selected"])

        # def on_assign_label(change):
        #     if change["new"]:
        #         self._editor.edit(self._dataset.columns[column_labels], self._scatter.selection())
        #         self._scatter.color(by="_dummy", map="magma")
        #         self._scatter.data(
        #             data=self._dataset.edited,
        #             use_index=False,
        #         )
        #         self._scatter.color(
        #             by=column_labels,
        #             map=self._editor.color_map(self._dataset.edited[column_labels]),
        #         )
        #         on_new_selection(change)

        # self._editor.observe(on_assign_label, ["label_assigned"])


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
        self._editor.layout.height = f"{self._height + 25}px"
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
