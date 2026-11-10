#!/usr/bin/env python3
"""Inspect GLB/GLTF node hierarchy and report whether parts can be animated separately."""
from __future__ import annotations
import argparse
import json
import struct
import sys
from pathlib import Path

GLB_MAGIC = 0x46546C67
JSON_CHUNK = 0x4E4F534A


def load_gltf(path: Path):
    suffix = path.suffix.lower()
    if suffix == '.glb':
        data = path.read_bytes()
        if len(data) < 20:
            raise ValueError('File is too small to be a valid GLB.')
        magic, version, total_length = struct.unpack_from('<III', data, 0)
        if magic != GLB_MAGIC:
            raise ValueError('Invalid GLB magic header.')
        if version != 2:
            raise ValueError(f'Unsupported GLB version {version}; expected version 2.')
        if total_length > len(data):
            raise ValueError('GLB header length exceeds the actual file size.')
        offset = 12
        document = None
        while offset + 8 <= min(total_length, len(data)):
            chunk_length, chunk_type = struct.unpack_from('<II', data, offset)
            offset += 8
            chunk = data[offset:offset + chunk_length]
            if len(chunk) != chunk_length:
                raise ValueError('Truncated GLB chunk.')
            if chunk_type == JSON_CHUNK:
                document = json.loads(chunk.decode('utf-8').rstrip('\x00 \t\r\n'))
                break
            offset += chunk_length
        if document is None:
            raise ValueError('No JSON chunk was found in the GLB.')
        return document, 'glb'
    if suffix == '.gltf':
        return json.loads(path.read_text(encoding='utf-8')), 'gltf'
    raise ValueError('Input must end in .glb or .gltf.')


def vec(value, default):
    return value if isinstance(value, list) and len(value) == 3 else default


def inspect(path: Path):
    doc, fmt = load_gltf(path)
    nodes = doc.get('nodes', [])
    meshes = doc.get('meshes', [])
    parents = {}
    for parent_index, node in enumerate(nodes):
        for child in node.get('children', []):
            parents[child] = parent_index

    scene_index = doc.get('scene', 0)
    scenes = doc.get('scenes', [])
    roots = scenes[scene_index].get('nodes', []) if scenes and 0 <= scene_index < len(scenes) else [i for i in range(len(nodes)) if i not in parents]

    accessors = doc.get('accessors', [])
    materials = doc.get('materials', [])

    def node_path(index):
        names = []
        cursor = index
        visited = set()
        while cursor is not None and cursor not in visited and 0 <= cursor < len(nodes):
            visited.add(cursor)
            names.append(nodes[cursor].get('name') or f'node-{cursor}')
            cursor = parents.get(cursor)
        return list(reversed(names))

    def primitive_details(mesh_doc):
        details = []
        for primitive_index, primitive in enumerate((mesh_doc or {}).get('primitives', [])):
            attributes = primitive.get('attributes', {})
            position_accessor_index = attributes.get('POSITION')
            position_accessor = accessors[position_accessor_index] if isinstance(position_accessor_index, int) and 0 <= position_accessor_index < len(accessors) else {}
            index_accessor_index = primitive.get('indices')
            index_accessor = accessors[index_accessor_index] if isinstance(index_accessor_index, int) and 0 <= index_accessor_index < len(accessors) else {}
            material_index = primitive.get('material')
            material = materials[material_index] if isinstance(material_index, int) and 0 <= material_index < len(materials) else {}
            index_count = index_accessor.get('count')
            vertex_count = position_accessor.get('count')
            mode = primitive.get('mode', 4)
            triangle_count = None
            if isinstance(index_count, int) and mode == 4:
                triangle_count = index_count // 3
            elif isinstance(vertex_count, int) and mode == 4:
                triangle_count = vertex_count // 3
            details.append({
                'primitiveIndex': primitive_index,
                'mode': mode,
                'vertexCount': vertex_count,
                'indexCount': index_count,
                'approxTriangleCount': triangle_count,
                'positionBoundsLocal': {
                    'min': position_accessor.get('min'),
                    'max': position_accessor.get('max')
                } if position_accessor else None,
                'materialIndex': material_index,
                'materialName': material.get('name'),
                'materialPbr': material.get('pbrMetallicRoughness'),
                'hasNormalAttribute': 'NORMAL' in attributes,
                'hasUvAttribute': 'TEXCOORD_0' in attributes,
            })
        return details

    def make_node(index, depth=0):
        node = nodes[index]
        mesh_index = node.get('mesh')
        mesh_doc = meshes[mesh_index] if isinstance(mesh_index, int) and 0 <= mesh_index < len(meshes) else None
        return {
            'index': index,
            'name': node.get('name') or f'node-{index}',
            'path': node_path(index),
            'parentIndex': parents.get(index),
            'depth': depth,
            'meshIndex': mesh_index,
            'meshName': (mesh_doc or {}).get('name'),
            'primitiveCount': len((mesh_doc or {}).get('primitives', [])),
            'primitives': primitive_details(mesh_doc),
            'children': [make_node(child, depth + 1) for child in node.get('children', []) if isinstance(child, int) and 0 <= child < len(nodes)],
            'translation': vec(node.get('translation'), [0, 0, 0]),
            'rotation': node.get('rotation', [0, 0, 0, 1]),
            'scale': vec(node.get('scale'), [1, 1, 1]),
            'matrix': node.get('matrix'),
        }

    tree = [make_node(i) for i in roots if isinstance(i, int) and 0 <= i < len(nodes)]
    mesh_nodes = [n for n in nodes if isinstance(n.get('mesh'), int)]
    named_mesh_nodes = [n for n in mesh_nodes if n.get('name')]
    named_nodes = [n for n in nodes if n.get('name')]
    duplicate_node_names = sorted({n['name'] for n in named_nodes if sum(1 for other in named_nodes if other['name'] == n['name']) > 1})
    duplicate_mesh_node_names = sorted({n['name'] for n in named_mesh_nodes if sum(1 for other in named_mesh_nodes if other['name'] == n['name']) > 1})
    mesh_primitive_count = sum(len(mesh.get('primitives', [])) for mesh in meshes)
    component_bytes = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
    accessor_arity = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9, 'MAT4': 16}
    accessor_bytes = sum((accessor.get('count', 0) or 0) * component_bytes.get(accessor.get('componentType'), 0) * accessor_arity.get(accessor.get('type'), 1) for accessor in accessors)

    warnings = []
    if len(mesh_nodes) <= 1:
        warnings.append('Only one node references a mesh. A meaningful part-level exploded view is unlikely without splitting/re-exporting the model.')
    if duplicate_node_names:
        warnings.append('Duplicate node names exist in the hierarchy. The runtime requires uniquely resolvable target names; rename ambiguous nodes before animating them.')
    if not named_mesh_nodes:
        warnings.append('Mesh nodes have no explicit names. Rename them before writing a stable part mapping.')
    if not nodes:
        warnings.append('No nodes were found.')
    if len(mesh_nodes) > 1 and len(named_mesh_nodes) != len(mesh_nodes):
        warnings.append('Some mesh nodes are unnamed. They may be separable, but stable semantic mapping is not ready.')
    if fmt == 'gltf' and doc.get('buffers'):
        warnings.append('External .gltf buffers may be missing or inaccessible. Load the asset in a viewer/browser to confirm all buffer and texture URIs resolve.')

    return {
        'file': str(path),
        'format': fmt,
        'assetVersion': doc.get('asset', {}).get('version'),
        'generator': doc.get('asset', {}).get('generator'),
        'summary': {
            'nodeCount': len(nodes),
            'meshCount': len(meshes),
            'meshNodeCount': len(mesh_nodes),
            'namedMeshNodeCount': len(named_mesh_nodes),
            'primitiveCount': mesh_primitive_count,
            'materialCount': len(materials),
            'accessorCount': len(accessors),
            'accessorPayloadBytesApprox': accessor_bytes,
            'separablePartsLikely': len(mesh_nodes) > 1 and len(named_mesh_nodes) == len(mesh_nodes) and not duplicate_mesh_node_names,
        },
        'meshNodeNames': [n.get('name') or f'node-{i}' for i, n in enumerate(nodes) if isinstance(n.get('mesh'), int)],
        'duplicateNodeNames': duplicate_node_names,
        'duplicateMeshNodeNames': duplicate_mesh_node_names,
        'hierarchy': tree,
        'warnings': warnings,
        'limitations': [
            'This inspector reads the glTF JSON structure and accessor metadata; it does not render the model.',
            'Position bounds are accessor-local and do not include transformed world-space bounds.',
            'Primitive counts are estimates and do not measure runtime GPU cost precisely.',
            'It does not verify visual identity, topology quality, external resource availability, ownership, license, attribution, or trademark permissions.'
        ]
    }



def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('model', type=Path, help='Path to a .glb or .gltf model')
    parser.add_argument('--compact', action='store_true', help='Print compact JSON')
    args = parser.parse_args()
    if not args.model.exists():
        print(f'Error: file not found: {args.model}', file=sys.stderr)
        return 2
    try:
        result = inspect(args.model)
    except (ValueError, OSError, json.JSONDecodeError, struct.error) as exc:
        print(f'Error: {exc}', file=sys.stderr)
        return 2
    print(json.dumps(result, indent=None if args.compact else 2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
