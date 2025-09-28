import pytest
import numpy as np
from thisnotthat import TagEditor


@pytest.fixture
def tag_widget():
    """Fixture to return a TagWidget prepopulated with sample tags."""
    widget = TagEditor()
    # Simulated points with sets of tags (strings)
    widget.tags = [
        {"apple", "banana"},  # point 0
        {"apple"},  # point 1
        {"banana", "cherry"},  # point 2
    ]
    widget.get_initial_tag_set()
    widget._update_tag_mapping()
    return widget


@pytest.fixture
def mapped_widget(tag_widget):
    """Fixture where widget.tags are converted to int sets using current mapping."""
    widget = tag_widget
    widget.tags = [widget._map_tags_to_int(s) for s in widget.tags]
    return widget


# Tests for get_initial_tag_set
def test_get_initial_tag_set_sorts_tags(tag_widget):
    tags_in_order = [t["tag"] for t in tag_widget.tag_set]
    assert tags_in_order == sorted(tags_in_order, key=str.lower)


def test_get_initial_tag_set_defaults_false(tag_widget):
    for t in tag_widget.tag_set:
        assert t["include_btn_active"] is False
        assert t["exclude_btn_active"] is False


def test_get_initial_tag_set_correct_number(tag_widget):
    unique_tags = set().union(
        *[set(s) for s in [{"apple", "banana"}, {"apple"}, {"banana", "cherry"}]]
    )
    assert len(tag_widget.tag_set) == len(unique_tags)


# Tests for _update_tag_mapping
def test_update_tag_mapping_assigns_unique_ids(tag_widget):
    tag_ids = list(tag_widget.tag_to_int.values())
    assert len(tag_ids) == len(set(tag_ids)), "All tag IDs should be unique"


def test_update_tag_mapping_reverses_mapping(tag_widget):
    for tag, id_ in tag_widget.tag_to_int.items():
        assert tag_widget.int_to_tag[id_] == tag


def test_update_tag_mapping_incrementing_ids(tag_widget):
    ids_sorted = sorted(tag_widget.tag_to_int.values())
    assert ids_sorted == list(range(len(ids_sorted)))


# Tests for _map_tags_to_int
def test_map_tags_to_int_returns_correct_ints(tag_widget):
    tags = {"apple", "banana"}
    mapped_ints = tag_widget._map_tags_to_int(tags)
    expected_ints = {tag_widget.tag_to_int["apple"], tag_widget.tag_to_int["banana"]}
    assert mapped_ints == expected_ints


def test_map_tags_to_int_with_unknown_tag(tag_widget):
    with pytest.raises(KeyError):
        tag_widget._map_tags_to_int({"unknown"})


# Tests for calculate_selection
def test_initial_selection_empty(mapped_widget):
    mapped_widget.tag_set = [
        {**t, "include_btn_active": False, "exclude_btn_active": False}
        for t in mapped_widget.tag_set
    ]
    mapped_widget.calculate_selection()
    assert mapped_widget.selection == []


def test_include_only(mapped_widget):
    updated = []
    for t in mapped_widget.tag_set:
        updated.append(
            {
                **t,
                "include_btn_active": t["tag"] == "apple",
                "exclude_btn_active": False,
            }
        )
    mapped_widget.tag_set = updated
    mapped_widget.calculate_selection()
    assert sorted(mapped_widget.selection) == [0, 1]


def test_exclude_only(mapped_widget):
    updated = []
    for t in mapped_widget.tag_set:
        updated.append(
            {
                **t,
                "include_btn_active": False,
                "exclude_btn_active": t["tag"] == "banana",
            }
        )
    mapped_widget.tag_set = updated
    mapped_widget.calculate_selection()
    assert sorted(mapped_widget.selection) == [1]


def test_include_and_exclude(mapped_widget):
    updated = []
    for t in mapped_widget.tag_set:
        updated.append(
            {
                **t,
                "include_btn_active": t["tag"] == "apple",
                "exclude_btn_active": t["tag"] == "banana",
            }
        )
    mapped_widget.tag_set = updated
    mapped_widget.calculate_selection()
    assert mapped_widget.selection == [1]


def test_include_multiple_tags(mapped_widget):
    updated = []
    for t in mapped_widget.tag_set:
        updated.append(
            {
                **t,
                "include_btn_active": t["tag"] in ("apple", "banana"),
                "exclude_btn_active": False,
            }
        )
    mapped_widget.tag_set = updated
    mapped_widget.calculate_selection()
    assert mapped_widget.selection == [0]


def test_include_and_exclude_no_selection(mapped_widget):
    updated = []
    for t in mapped_widget.tag_set:
        updated.append(
            {
                **t,
                "include_btn_active": t["tag"] == "cherry",
                "exclude_btn_active": t["tag"] == "banana",
            }
        )
    mapped_widget.tag_set = updated
    mapped_widget.calculate_selection()
    assert mapped_widget.selection == []
