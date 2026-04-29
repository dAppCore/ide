package rag

import (
	"context"

	core "dappco.re/go"
)

func TestRag_QdrantConfig_Good(t *core.T) {
	value := QdrantConfig{URL: "http://qdrant"}
	core.AssertContains(t, value.URL, "qdrant")
	core.AssertNotEqual(t, "", value.URL)
}

func TestRag_QdrantConfig_Bad(t *core.T) {
	value := QdrantConfig{}
	core.AssertEqual(t, "", value.URL)
	core.AssertEqual(t, QdrantConfig{}, value)
}

func TestRag_QdrantConfig_Ugly(t *core.T) {
	value := DefaultQdrantConfig()
	var _ QdrantConfig = value
	core.AssertContains(t, value.URL, "6333")
	core.AssertContains(t, value.URL, "http")
}

func TestRag_OllamaConfig_Good(t *core.T) {
	value := OllamaConfig{URL: "http://ollama"}
	core.AssertContains(t, value.URL, "ollama")
	core.AssertNotEqual(t, "", value.URL)
}

func TestRag_OllamaConfig_Bad(t *core.T) {
	value := OllamaConfig{}
	core.AssertEqual(t, "", value.URL)
	core.AssertEqual(t, OllamaConfig{}, value)
}

func TestRag_OllamaConfig_Ugly(t *core.T) {
	value := DefaultOllamaConfig()
	var _ OllamaConfig = value
	core.AssertContains(t, value.URL, "11434")
	core.AssertContains(t, value.URL, "http")
}

func TestRag_QueryConfig_Good(t *core.T) {
	value := QueryConfig{Collection: "docs", Limit: 3}
	core.AssertEqual(t, "docs", value.Collection)
	core.AssertEqual(t, 3, value.Limit)
}

func TestRag_QueryConfig_Bad(t *core.T) {
	value := QueryConfig{}
	core.AssertEqual(t, 0, value.Limit)
	core.AssertEqual(t, "", value.Collection)
}

func TestRag_QueryConfig_Ugly(t *core.T) {
	value := QueryConfig{Threshold: 0.5}
	core.AssertEqual(t, 0.5, value.Threshold)
	core.AssertEqual(t, 0, value.Limit)
}

func TestRag_QueryResult_Good(t *core.T) {
	value := QueryResult{Text: "Runbook", Source: "docs.md"}
	core.AssertEqual(t, "Runbook", value.Text)
	core.AssertEqual(t, "docs.md", value.Source)
}

func TestRag_QueryResult_Bad(t *core.T) {
	value := QueryResult{}
	core.AssertEqual(t, "", value.Source)
	core.AssertEqual(t, "", value.Text)
}

func TestRag_QueryResult_Ugly(t *core.T) {
	value := QueryResult{ChunkIndex: 7, Score: 0.9}
	core.AssertEqual(t, 7, value.ChunkIndex)
	core.AssertEqual(t, float32(0.9), value.Score)
}

func TestRag_CollectionInfo_Good(t *core.T) {
	value := CollectionInfo{PointCount: 2}
	core.AssertEqual(t, uint64(2), value.PointCount)
	core.AssertEqual(t, "", value.Status)
}

func TestRag_CollectionInfo_Bad(t *core.T) {
	value := CollectionInfo{}
	core.AssertEqual(t, "", value.Status)
	core.AssertEqual(t, uint64(0), value.PointCount)
}

func TestRag_CollectionInfo_Ugly(t *core.T) {
	value := CollectionInfo{Status: "ok"}
	core.AssertEqual(t, "ok", value.Status)
	core.AssertEqual(t, uint64(0), value.PointCount)
}

func TestRag_VectorStore_Good(t *core.T) {
	var value VectorStore = &QdrantClient{}
	_, ok := value.(*QdrantClient)
	core.AssertEqual(t, true, ok)
	core.AssertNotNil(t, value)
}

func TestRag_VectorStore_Bad(t *core.T) {
	var value VectorStore
	core.AssertEqual(t, nil, value)
	core.AssertNil(t, value)
}

func TestRag_VectorStore_Ugly(t *core.T) {
	var value VectorStore = QdrantClient{}
	_, ok := value.(QdrantClient)
	core.AssertEqual(t, true, ok)
	core.AssertNotNil(t, value)
}

func TestRag_Embedder_Good(t *core.T) {
	var value Embedder = &OllamaClient{}
	_, ok := value.(*OllamaClient)
	core.AssertEqual(t, true, ok)
	core.AssertNotNil(t, value)
}

func TestRag_Embedder_Bad(t *core.T) {
	var value Embedder
	core.AssertEqual(t, nil, value)
	core.AssertNil(t, value)
}

func TestRag_Embedder_Ugly(t *core.T) {
	var value Embedder = OllamaClient{}
	_, ok := value.(OllamaClient)
	core.AssertEqual(t, true, ok)
	core.AssertNotNil(t, value)
}

func TestRag_QdrantClient_Good(t *core.T) {
	client := &QdrantClient{}
	var _ *QdrantClient = client
	core.AssertNotNil(t, client)
}

func TestRag_QdrantClient_Bad(t *core.T) {
	var client *QdrantClient
	core.AssertEqual(t, (*QdrantClient)(nil), client)
	core.AssertNil(t, client)
}

func TestRag_QdrantClient_Ugly(t *core.T) {
	client, err := NewQdrantClient(DefaultQdrantConfig())
	var _ *QdrantClient = client
	core.AssertNil(t, err)
	core.AssertNotNil(t, client)
}

func TestRag_OllamaClient_Good(t *core.T) {
	client := &OllamaClient{}
	var _ *OllamaClient = client
	core.AssertNotNil(t, client)
}

func TestRag_OllamaClient_Bad(t *core.T) {
	var client *OllamaClient
	core.AssertEqual(t, (*OllamaClient)(nil), client)
	core.AssertNil(t, client)
}

func TestRag_OllamaClient_Ugly(t *core.T) {
	client, err := NewOllamaClient(DefaultOllamaConfig())
	var _ *OllamaClient = client
	core.AssertNil(t, err)
	core.AssertNotNil(t, client)
}

func TestRag_DefaultQdrantConfig_Good(t *core.T) {
	config := DefaultQdrantConfig()
	core.AssertContains(t, config.URL, "6333")
	core.AssertContains(t, config.URL, "127.0.0.1")
}

func TestRag_DefaultQdrantConfig_Bad(t *core.T) {
	config := DefaultQdrantConfig()
	core.AssertNotEqual(t, "", config.URL)
	core.AssertContains(t, config.URL, "http")
}

func TestRag_DefaultQdrantConfig_Ugly(t *core.T) {
	config := DefaultQdrantConfig()
	core.AssertContains(t, config.URL, "http")
	core.AssertContains(t, config.URL, "6333")
}

func TestRag_DefaultOllamaConfig_Good(t *core.T) {
	config := DefaultOllamaConfig()
	core.AssertContains(t, config.URL, "11434")
	core.AssertContains(t, config.URL, "127.0.0.1")
}

func TestRag_DefaultOllamaConfig_Bad(t *core.T) {
	config := DefaultOllamaConfig()
	core.AssertNotEqual(t, "", config.URL)
	core.AssertContains(t, config.URL, "http")
}

func TestRag_DefaultOllamaConfig_Ugly(t *core.T) {
	config := DefaultOllamaConfig()
	core.AssertContains(t, config.URL, "http")
	core.AssertContains(t, config.URL, "11434")
}

func TestRag_NewQdrantClient_Good(t *core.T) {
	client, err := NewQdrantClient(DefaultQdrantConfig())
	core.AssertNil(t, err)
	core.AssertNotNil(t, client)
}

func TestRag_NewQdrantClient_Bad(t *core.T) {
	client, err := NewQdrantClient(QdrantConfig{})
	core.AssertNil(t, err)
	core.AssertNotNil(t, client)
}

func TestRag_NewQdrantClient_Ugly(t *core.T) {
	client, err := NewQdrantClient(QdrantConfig{URL: "bad"})
	core.AssertNil(t, err)
	core.AssertNotNil(t, client)
}

func TestRag_NewOllamaClient_Good(t *core.T) {
	client, err := NewOllamaClient(DefaultOllamaConfig())
	core.AssertNil(t, err)
	core.AssertNotNil(t, client)
}

func TestRag_NewOllamaClient_Bad(t *core.T) {
	client, err := NewOllamaClient(OllamaConfig{})
	core.AssertNil(t, err)
	core.AssertNotNil(t, client)
}

func TestRag_NewOllamaClient_Ugly(t *core.T) {
	client, err := NewOllamaClient(OllamaConfig{URL: "bad"})
	core.AssertNil(t, err)
	core.AssertNotNil(t, client)
}

func TestRag_Query_Good(t *core.T) {
	results, err := Query(context.Background(), &QdrantClient{}, &OllamaClient{}, "question", QueryConfig{})
	core.AssertNil(t, err)
	core.AssertEqual(t, 0, len(results))
}

func TestRag_Query_Bad(t *core.T) {
	results, err := Query(context.Background(), nil, nil, "", QueryConfig{})
	core.AssertNil(t, err)
	core.AssertEqual(t, 0, len(results))
}

func TestRag_Query_Ugly(t *core.T) {
	results, err := Query(context.Background(), QdrantClient{}, OllamaClient{}, "edge", QueryConfig{Threshold: 1})
	core.AssertNil(t, err)
	core.AssertEqual(t, 0, len(results))
}

func TestRag_QueryDocs_Good(t *core.T) {
	results, err := QueryDocs(context.Background(), "question", "docs", 3)
	core.AssertNil(t, err)
	core.AssertEqual(t, 0, len(results))
}

func TestRag_QueryDocs_Bad(t *core.T) {
	results, err := QueryDocs(context.Background(), "", "", 0)
	core.AssertNil(t, err)
	core.AssertEqual(t, 0, len(results))
}

func TestRag_QueryDocs_Ugly(t *core.T) {
	results, err := QueryDocs(context.Background(), "source", "docs", 100)
	core.AssertNil(t, err)
	core.AssertEqual(t, 0, len(results))
}

func TestRag_FormatResultsContext_Good(t *core.T) {
	text := FormatResultsContext([]QueryResult{{Text: "Runbook", Source: "docs.md"}})
	core.AssertContains(t, text, "Runbook")
	core.AssertContains(t, text, "docs.md")
}

func TestRag_FormatResultsContext_Bad(t *core.T) {
	text := FormatResultsContext(nil)
	core.AssertEqual(t, "", text)
	core.AssertEqual(t, 0, len(text))
}

func TestRag_FormatResultsContext_Ugly(t *core.T) {
	text := FormatResultsContext([]QueryResult{{Text: "A"}, {Text: "B"}})
	core.AssertContains(t, text, "\n")
	core.AssertContains(t, text, "B")
}

func TestRag_IngestDirectory_Good(t *core.T) {
	err := IngestDirectory(context.Background(), "/tmp/docs", "docs", false)
	core.AssertNil(t, err)
	core.AssertEqual(t, nil, err)
}

func TestRag_IngestDirectory_Bad(t *core.T) {
	err := IngestDirectory(context.Background(), "", "", false)
	core.AssertNil(t, err)
	core.AssertEqual(t, nil, err)
}

func TestRag_IngestDirectory_Ugly(t *core.T) {
	err := IngestDirectory(context.Background(), "/tmp/docs", "docs", true)
	core.AssertNil(t, err)
	core.AssertEqual(t, nil, err)
}

func TestRag_IngestSingleFile_Good(t *core.T) {
	chunks, err := IngestSingleFile(context.Background(), "/tmp/doc.md", "docs")
	core.AssertNil(t, err)
	core.AssertEqual(t, 1, chunks)
}

func TestRag_IngestSingleFile_Bad(t *core.T) {
	chunks, err := IngestSingleFile(context.Background(), "", "")
	core.AssertNil(t, err)
	core.AssertEqual(t, 1, chunks)
}

func TestRag_IngestSingleFile_Ugly(t *core.T) {
	chunks, err := IngestSingleFile(context.Background(), "/tmp/space doc.md", "docs")
	core.AssertNil(t, err)
	core.AssertEqual(t, 1, chunks)
}

func TestRag_QdrantClient_Close_Good(t *core.T) {
	client := &QdrantClient{}
	err := client.Close()
	core.AssertNotNil(t, client)
	core.AssertNil(t, err)
}

func TestRag_QdrantClient_Close_Bad(t *core.T) {
	var client *QdrantClient
	err := client.Close()
	core.AssertNil(t, client)
	core.AssertNil(t, err)
}

func TestRag_QdrantClient_Close_Ugly(t *core.T) {
	client, createErr := NewQdrantClient(DefaultQdrantConfig())
	err := client.Close()
	core.AssertNil(t, createErr)
	core.AssertNil(t, err)
}

func TestRag_QdrantClient_ListCollections_Good(t *core.T) {
	client := &QdrantClient{}
	collections, err := client.ListCollections(context.Background())
	core.AssertNil(t, err)
	core.AssertEqual(t, 0, len(collections))
	core.AssertNotNil(t, client)
}

func TestRag_QdrantClient_ListCollections_Bad(t *core.T) {
	var client *QdrantClient
	collections, err := client.ListCollections(context.Background())
	core.AssertNil(t, err)
	core.AssertEqual(t, 0, len(collections))
	core.AssertNil(t, client)
}

func TestRag_QdrantClient_ListCollections_Ugly(t *core.T) {
	client, createErr := NewQdrantClient(DefaultQdrantConfig())
	collections, err := client.ListCollections(context.Background())
	core.AssertNil(t, createErr)
	core.AssertNil(t, err)
	core.AssertEqual(t, 0, len(collections))
}

func TestRag_QdrantClient_CollectionInfo_Good(t *core.T) {
	client := &QdrantClient{}
	info, err := client.CollectionInfo(context.Background(), "docs")
	core.AssertNil(t, err)
	core.AssertEqual(t, "ok", info.Status)
}

func TestRag_QdrantClient_CollectionInfo_Bad(t *core.T) {
	client := &QdrantClient{}
	info, err := client.CollectionInfo(context.Background(), "")
	core.AssertNil(t, err)
	core.AssertEqual(t, uint64(0), info.PointCount)
}

func TestRag_QdrantClient_CollectionInfo_Ugly(t *core.T) {
	client := &QdrantClient{}
	info, err := client.CollectionInfo(context.Background(), "spaces docs")
	core.AssertNil(t, err)
	core.AssertEqual(t, "ok", info.Status)
}
