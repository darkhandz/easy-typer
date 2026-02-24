import { EasyTyperDbExportV1, parseDbExport, parseDbExportRaw, stringifyDbExport, validateDbExportV1 } from '@/store/util/DbTransfer'

describe('DbTransfer', () => {
  it('stringify/parse 能保留 Map/Set/Date', () => {
    const data: EasyTyperDbExportV1 = {
      format: 'easy-typer-db-export',
      formatVersion: 1,
      dbName: 'QuickTyping',
      exportedAt: 1710000000000,
      tables: {
        configs: {
          rows: [
            {
              key: 'setting',
              value: {
                punctuations: new Map([['，', ',']]),
                exampleSet: new Set([1, 2, 3]),
                exampleDate: new Date('2020-01-01T00:00:00.000Z')
              }
            }
          ]
        }
      }
    }

    const json = stringifyDbExport(data)
    const raw = parseDbExportRaw(json)
    const valid = validateDbExportV1(raw, ['configs'])
    expect(valid.ok).toBe(true)

    const revived = parseDbExport(json) as EasyTyperDbExportV1
    const value = revived.tables.configs.rows[0].value as unknown as {
      punctuations: Map<string, string>;
      exampleSet: Set<number>;
      exampleDate: Date;
    }
    expect(value.punctuations).toBeInstanceOf(Map)
    expect(Array.from(value.punctuations.entries())).toEqual([['，', ',']])
    expect(value.exampleSet).toBeInstanceOf(Set)
    expect(Array.from(value.exampleSet.values())).toEqual([1, 2, 3])
    expect(value.exampleDate).toBeInstanceOf(Date)
    expect(value.exampleDate.toISOString()).toBe('2020-01-01T00:00:00.000Z')
  })

  it('validateDbExportV1 会拒绝缺失表的数据', () => {
    const raw: unknown = {
      format: 'easy-typer-db-export',
      formatVersion: 1,
      dbName: 'QuickTyping',
      exportedAt: 1710000000000,
      tables: {}
    }

    const valid = validateDbExportV1(raw, ['configs'])
    expect(valid.ok).toBe(false)
  })
})
