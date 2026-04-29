package rag

import (
	"context"

	core "dappco.re/go"
)

func ExampleQdrantConfig() {
	config := QdrantConfig{URL: "http://qdrant"}
	core.Println(config.URL)
	// Output: http://qdrant
}

func ExampleOllamaConfig() {
	config := OllamaConfig{URL: "http://ollama"}
	core.Println(config.URL)
	// Output: http://ollama
}

func ExampleQueryConfig() {
	config := QueryConfig{Collection: "docs"}
	core.Println(config.Collection)
	// Output: docs
}

func ExampleQueryResult() {
	result := QueryResult{Text: "Runbook"}
	core.Println(result.Text)
	// Output: Runbook
}

func ExampleCollectionInfo() {
	info := CollectionInfo{Status: "ok"}
	core.Println(info.Status)
	// Output: ok
}

func ExampleVectorStore() {
	var store VectorStore = &QdrantClient{}
	core.Println(store != nil)
	// Output: true
}

func ExampleEmbedder() {
	var embedder Embedder = &OllamaClient{}
	core.Println(embedder != nil)
	// Output: true
}

func ExampleQdrantClient() {
	client := &QdrantClient{}
	core.Println(client != nil)
	// Output: true
}

func ExampleOllamaClient() {
	client := &OllamaClient{}
	core.Println(client != nil)
	// Output: true
}

func ExampleDefaultQdrantConfig() {
	config := DefaultQdrantConfig()
	core.Println(config.URL)
	// Output: http://127.0.0.1:6333
}

func ExampleDefaultOllamaConfig() {
	config := DefaultOllamaConfig()
	core.Println(config.URL)
	// Output: http://127.0.0.1:11434
}

func ExampleNewQdrantClient() {
	client, _ := NewQdrantClient(DefaultQdrantConfig())
	core.Println(client != nil)
	// Output: true
}

func ExampleNewOllamaClient() {
	client, _ := NewOllamaClient(DefaultOllamaConfig())
	core.Println(client != nil)
	// Output: true
}

func ExampleQuery() {
	results, _ := Query(context.Background(), &QdrantClient{}, &OllamaClient{}, "question", QueryConfig{})
	core.Println(len(results))
	// Output: 0
}

func ExampleQueryDocs() {
	results, _ := QueryDocs(context.Background(), "question", "docs", 3)
	core.Println(len(results))
	// Output: 0
}

func ExampleFormatResultsContext() {
	text := FormatResultsContext([]QueryResult{{Text: "Runbook"}})
	core.Println(text)
	// Output: Runbook
}

func ExampleIngestDirectory() {
	err := IngestDirectory(context.Background(), "/tmp/docs", "docs", false)
	core.Println(err == nil)
	// Output: true
}

func ExampleIngestSingleFile() {
	chunks, _ := IngestSingleFile(context.Background(), "/tmp/doc.md", "docs")
	core.Println(chunks)
	// Output: 1
}

func ExampleQdrantClient_Close() {
	client := &QdrantClient{}
	err := client.Close()
	core.Println(err == nil)
	// Output: true
}

func ExampleQdrantClient_ListCollections() {
	client := &QdrantClient{}
	collections, _ := client.ListCollections(context.Background())
	core.Println(len(collections))
	// Output: 0
}

func ExampleQdrantClient_CollectionInfo() {
	client := &QdrantClient{}
	info, _ := client.CollectionInfo(context.Background(), "docs")
	core.Println(info.Status)
	// Output: ok
}
