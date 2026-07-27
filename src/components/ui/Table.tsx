import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { DefaultTheme } from '@/constants/defaultTheme';

type ColumnAlign = 'left' | 'center' | 'right';

type BaseColumn = {
  key: string;
  header: string;
  width?: number | `${number}%`;
  align?: ColumnAlign;
};

export type TableColumn<T> = BaseColumn &
  ({ render: (row: T) => ReactNode } | { accessor: (row: T) => string });

type TableProps<T> = {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  emptyLabel?: string;
  highlightKey?: string | null;
  style?: StyleProp<ViewStyle>;
};

function columnFlexStyle(column: BaseColumn): ViewStyle {
  if (column.width === undefined) {
    return { flex: 1 };
  }
  return { width: column.width, flexGrow: 0, flexShrink: 0 };
}

function renderCell<T>(column: TableColumn<T>, row: T): ReactNode {
  if ('render' in column) {
    return column.render(row);
  }
  return (
    <Text style={styles.cellText} numberOfLines={1}>
      {column.accessor(row)}
    </Text>
  );
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyLabel = 'No records',
  highlightKey = null,
  style,
}: TableProps<T>) {
  return (
    <View style={[styles.table, style]}>
      <View style={styles.headerRow}>
        {columns.map((column) => (
          <View
            key={column.key}
            style={[styles.cell, columnFlexStyle(column), { alignItems: alignToItems(column.align) }]}>
            <Text style={styles.headerText} numberOfLines={1}>
              {column.header}
            </Text>
          </View>
        ))}
      </View>
      {data.length === 0 ? (
        <View style={styles.emptyRow}>
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </View>
      ) : (
        data.map((row, index) => (
          <View
            key={keyExtractor(row, index)}
            style={[
              styles.row,
              index === data.length - 1 && styles.rowLast,
              highlightKey != null &&
                keyExtractor(row, index) === highlightKey &&
                styles.rowHighlighted,
            ]}>
            {columns.map((column) => (
              <View
                key={column.key}
                style={[styles.cell, columnFlexStyle(column), { alignItems: alignToItems(column.align) }]}>
                {renderCell(column, row)}
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

function alignToItems(align?: ColumnAlign): ViewStyle['alignItems'] {
  if (align === 'right') return 'flex-end';
  if (align === 'center') return 'center';
  return 'flex-start';
}

const styles = StyleSheet.create({
  table: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: DefaultTheme.colors.line,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DefaultTheme.colors.line,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowHighlighted: {
    paddingHorizontal: 10,
    marginHorizontal: -10,
    borderRadius: DefaultTheme.radius.sm,
    borderBottomColor: 'transparent',
    backgroundColor: DefaultTheme.colors.softGold,
  },
  cell: {
    paddingRight: 10,
    justifyContent: 'center',
  },
  headerText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodySemiBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cellText: {
    color: DefaultTheme.colors.ink,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
  },
  emptyRow: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: DefaultTheme.colors.muted,
    fontFamily: DefaultTheme.fonts.bodyMedium,
    fontSize: 13,
  },
});
