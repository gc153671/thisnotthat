from anywidget import AnyWidget
from collections.abc import Hashable, Mapping
import glasbey
import ipywidgets as wg
from jscatter import Scatter
from matplotlib.colors import to_rgba
import pandas as pd
from pathlib import Path
import traitlets as tl
from typing import Any
import numpy as np

NAME_UNLABELLED = "<Unlabelled>"
Categorical = Hashable
Label = str
Tag = str


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


class LabelEditor(AnyWidget):

    labels = tl.List().tag(sync=True)
    categories = tl.List().tag(sync=True)
    palette = tl.List(default_value=[]).tag(sync=True)
    size_font = tl.Int(default_value=12).tag(sync=True)
    width_color_bar = tl.Int(default_value=30).tag(sync=True)
    space_color_bar_info = tl.Int(default_value=5).tag(sync=True)
    selection = tl.List(default_value=[]).tag(sync=True)

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        if not self.palette:
            # self.palette = glasbey.extend_palette([self.color_uncat], 257)[1:]
            self.palette = [
                to_rgba(c)
                for c in glasbey.extend_palette([to_rgba(COLOR_UNLABELLED)], 256)
            ]


class CategoricalEditor(LabelEditor):

    _esm = Path(__file__).parent / "js" / "legend" / "categorical.js"
    _css = Path(__file__).parent / "css" / "legend" / "categorical.css"

    min_height_item = tl.Int(default_value=24).tag(sync=True)


class TagWidget(AnyWidget):
    tags = tl.List(trait=tl.Set()).tag(sync=True)
    tag_set = tl.List(trait=tl.Dict()).tag(sync=True)
    tag_int_id = tl.Int(default_value=0).tag(sync=True)

    tag_to_int = tl.Dict(default_value={}).tag(sync=True)
    int_to_tag = tl.Dict(default_value={}).tag(sync=True)
    selection = tl.List(default_value=[]).tag(sync=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.get_initial_tag_set()
        self._update_tag_mapping()
        self.tags = [self._map_tags_to_int(t) for t in self.tags]
        self.observe(self._on_state_change, names=["tag_set"])
        self.on_msg(self._handle_js_message)

    def get_initial_tag_set(self):
        if self.tags:
            tag_set_tmp = set()
            for s in self.tags:
                tag_set_tmp.update(s)
            sorted_tags = sorted(list(tag_set_tmp), key=str.lower)
        else:
            sorted_tags = []

        self.tag_set = [
            {
                "tag_id": idx,
                "tag": tag,
                "include_btn_active": False,
                "exclude_btn_active": False,
            }
            for idx, tag in enumerate(sorted_tags)
        ]

    def _update_tag_mapping(self):
        for tag_dict in self.tag_set:
            tag = tag_dict["tag"]
            if tag not in self.tag_to_int:
                self.tag_to_int[tag] = self.tag_int_id
                self.tag_int_id += 1
        self.int_to_tag = {id_: tag for tag, id_ in self.tag_to_int.items()}

    def _map_tags_to_int(self, point_tags):
        return set([self.tag_to_int[t] for t in point_tags])

    def _on_state_change(self, change):
        self._update_tag_mapping()
        self.calculate_selection()

    def calculate_selection(self):
        include_buttons_checked = {
            tag["tag_id"]
            for tag in self.tag_set
            if tag["include_btn_active"]
        }
        exclude_buttons_checked = {
            tag["tag_id"]
            for tag in self.tag_set
            if tag["exclude_btn_active"]
        }

        to_select = np.where([
            include_buttons_checked.issubset(s) for s in self.tags
        ])[0]

        to_remove = np.where([
            bool(exclude_buttons_checked.intersection(s)) for s in self.tags
        ])[0]

        new_selection = np.setdiff1d(to_select, to_remove).tolist()
        if any(t["include_btn_active"] for t in self.tag_set) or \
           any(t["exclude_btn_active"] for t in self.tag_set):
            if len(new_selection) == 0:
                new_selection = []
        else:
            new_selection = []

        self.selection = new_selection


    def add_tag_to_selected(self, tag_name, assign=True):
        """Ensure tag exists and optionally assign to selected points."""
        # Ensure mapping
        if tag_name not in self.tag_to_int:
            tag_id_int = self.tag_int_id
            self.tag_to_int[tag_name] = tag_id_int
            self.int_to_tag[tag_id_int] = tag_name
            self.tag_int_id += 1

            # New tag_id for UI
            next_tag_id = max([t["tag_id"] for t in self.tag_set], default=-1) + 1
            self.tag_set.append({
                "tag_id": next_tag_id,
                "tag": tag_name,
                "include_btn_active": False,
                "exclude_btn_active": False
            })

        tag_id_int = self.tag_to_int[tag_name]

        if assign and self.selection:
            for idx in self.selection:
                self.tags[idx].add(tag_id_int)

        # Sort alphabetically before syncing to frontend
        self.tag_set.sort(key=lambda t: t["tag"].lower())

        # Force frontend to refresh
        self.tags = self.tags
        self.tag_set = self.tag_set

    def _handle_js_message(self, _, content, buffers):
        if content.get("action") == "assign_tag_to_selection":
            tag = content.get("tag")
            assign = content.get("assign", True)
            self.add_tag_to_selected(tag, assign)


class TagEditor(TagWidget):
    _esm = Path(__file__).parent / "js" / "legend" / "tag_editor.js"
    _css = Path(__file__).parent / "css" / "legend" / "tag_editor.css"

    min_height_item = tl.Int(default_value=24).tag(sync=True)

class Dashboard:

    def __init__(
        self,
        data: pd.DataFrame,
        labels: str | list[Label] | dict[Hashable, Label] | pd.Series | None,
        tags: str | list[Tag] | dict[Hashable, Tag] | pd.Series = [],
        height: int = 400
    ) -> None:
        self._data = data
        self._height = height

        if isinstance(labels, str):
            dict_labels = self._data[labels].to_dict()
        else:
            raise NotImplementedError()

        # TODO: make this configurable
        column_x = "x"
        column_y = "y"

        labels_normalized = pd.Series(
            {k: normalize_categorical(v) for k, v in dict_labels.items()},
            index=self._data.index
        ).fillna(NAME_UNLABELLED).to_list()
        self._editor = CategoricalEditor(
            labels=labels_normalized,
            categories=[
                NAME_UNLABELLED,
                *sorted(set(labels_normalized) - {NAME_UNLABELLED})
            ],
        )
        self._scatter = Scatter(
            data=self._data.join(
                self.labels(name="__labels__"),
                how="left",
            ),
            x=column_x,
            y=column_y,
            color_by="__labels__",
            color_map=self._editor.palette,
            height=self._height,
        )
        self._scatter.widget.color = self._editor.palette
        self._tag_editor = TagEditor(tags=tags)

        def on_color_change(_change):
            self._scatter.color(map=self._editor.palette)
            self._scatter.widget.color = self._editor.palette

        # TODO: do we care to observe color changes applied directly to the scatterplot?
        #       I don't think so.
        self._editor.observe(on_color_change, "palette")

        def on_selection_change_editor(change):
            self._scatter.selection(change["new"])

        def on_selection_change_tag_editor(change):
            self._scatter.selection(change["new"])

        def on_selection_change_plot(change):
            self._editor.selection = [int(n) for n in change["new"]]
            self._tag_editor.selection = [int(n) for n in change["new"]]

        self._editor.observe(on_selection_change_editor, ["selection"])
        self._tag_editor.observe(on_selection_change_tag_editor, ["selection"])
        self._scatter.widget.observe(on_selection_change_plot, ["selection"])

        def on_change_labels(change):
            self._scatter.data(
                self._data.join(self.labels(name="__labels__")),
                how="left"
            )

        self._editor.observe(on_change_labels, "labels")

    def labels(self, name: str = "labels", colors: str = "") -> pd.Series:
        # TODO: if colors is defined to some non-empty string, the returned array should
        # include a second column with the hex representation of the colors associated
        # to each label.
        assert not colors
        labels = pd.Series(
            pd.Categorical(self._editor.labels, categories=self._editor.categories),
            index=self._data.index,
            name=name,
        ).to_frame()
        return labels

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

        self._tag_editor.layout.flex = "1 0 auto"
        self._tag_editor.layout.min_width = "1in"
        self._tag_editor.layout.max_width = "2.5in"
        self._tag_editor.layout.margin = "0px 5px 0px 0px"
        self._tag_editor.layout.height = f"{self._height + 25}px"
        hbox = wg.HBox(
            children=[self._editor, sw, self._tag_editor],
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
    "LabelEditor",
    "TagEditor",
]
