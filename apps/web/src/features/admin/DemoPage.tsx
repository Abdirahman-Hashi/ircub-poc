import { Anchor, Card, Code, List, Stack, Table, Text } from '@mantine/core';

import { PageHeader } from '../../components/PageHeader';
import { mocksUrl } from '../../lib/mocks-url';
import { MOCKS_PATHS } from '../../lib/mocks-url.constants';

import type { ReactElement } from 'react';

/** How to drive the mock channels during a demo (apps/mocks/CLAUDE.md). */
export function DemoPage(): ReactElement {
  return (
    <Stack maw={880}>
      <PageHeader title="Demo helper" />
      <Card withBorder>
        <Text fw={600} mb="xs">
          Scenario amounts
        </Text>
        <Text size="sm" c="dimmed" mb="sm">
          The mock bank and mobile-money channels decide the outcome of an online payment from the
          cents of the amount. Everything else succeeds with a signed callback a few seconds later.
        </Text>
        <Table withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Amount ends in</Table.Th>
              <Table.Th>Channel behaviour</Table.Th>
              <Table.Th>What IRCUB shows</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>
                <Code>.00</Code> (anything else)
              </Table.Td>
              <Table.Td>Callback SUCCESS after the configured delay</Table.Td>
              <Table.Td>PENDING → CONFIRMED, ledger updated, live toast</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>
                <Code>.99</Code>
              </Table.Td>
              <Table.Td>Callback FAILED</Table.Td>
              <Table.Td>PENDING → FAILED with the channel’s reason</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>
                <Code>.77</Code>
              </Table.Td>
              <Table.Td>No callback; status check answers PENDING twice, then SUCCESS</Table.Td>
              <Table.Td>Confirmed by the status-check job on its third attempt</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>
                <Code>.66</Code>
              </Table.Td>
              <Table.Td>No callback; every status check returns an error</Table.Td>
              <Table.Td>
                PERMANENTLY FAILED after the retry limit; supervisors are e-mailed and the bell
                lights up
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Card>
      <Card withBorder>
        <Text fw={600} mb="xs">
          Reconciliation
        </Text>
        <List size="sm">
          <List.Item>
            Run a reconciliation with “perturbed statement” ticked: the channel drops one line,
            nudges one amount by 0.01 and adds an unknown transaction, so all four line statuses
            appear.
          </List.Item>
          <List.Item>
            Upload the same CSV again through “Upload statement” to see a clean run.
          </List.Item>
        </List>
      </Card>
      <Card withBorder>
        <Text fw={600} mb="xs">
          Mock services
        </Text>
        <List size="sm">
          <List.Item>
            Outbox (SMS and e-mail the system sent):{' '}
            <Anchor href={mocksUrl(MOCKS_PATHS.OUTBOX)} target="_blank" rel="noreferrer">
              {mocksUrl(MOCKS_PATHS.OUTBOX)}
            </Anchor>
          </List.Item>
          <List.Item>
            Mock API docs:{' '}
            <Anchor href={mocksUrl(MOCKS_PATHS.DOCS)} target="_blank" rel="noreferrer">
              {mocksUrl(MOCKS_PATHS.DOCS)}
            </Anchor>
          </List.Item>
        </List>
      </Card>
    </Stack>
  );
}
