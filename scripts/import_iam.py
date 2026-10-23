"""Read the fictitious workbook without modifying it; retain original event times."""
import json
import argparse
from pathlib import Path
import openpyxl

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('workbook', type=Path, help='Path to Base_IAM_7000_pacientes_ficticios.xlsx')
source = parser.parse_args().workbook
book = openpyxl.load_workbook(source, read_only=True, data_only=True)
rows = list(book['Pacientes IAM'].values)
records = [[v.isoformat(timespec='seconds') if hasattr(v, 'isoformat') else v for v in row[:13]] for row in rows[1:]]
assert len(records) == 7000
assert len({row[0] for row in records}) == 7000
assert all(all(v is not None for v in row) for row in records)
output = Path(__file__).resolve().parents[1] / 'src/data/iamPatients.json'
output.write_text(json.dumps({'source': source.name, 'synthetic': True, 'records': records}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'Imported {len(records)} fictitious records into {output.name}')
