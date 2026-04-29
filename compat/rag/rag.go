package rag

import (
	"context"

	core "dappco.re/go"
)

type QdrantConfig struct {
	URL string
}

type OllamaConfig struct {
	URL string
}

type QueryConfig struct {
	Collection string
	Limit      int
	Threshold  float64
}

type QueryResult struct {
	Text       string
	Source     string
	Section    string
	Category   string
	ChunkIndex int
	Score      float32
}

type CollectionInfo struct {
	PointCount uint64
	Status     string
}

type VectorStore interface{}

type Embedder interface{}

type QdrantClient struct{}

type OllamaClient struct{}

func DefaultQdrantConfig() QdrantConfig {
	return QdrantConfig{URL: "http://127.0.0.1:6333"}
}

func DefaultOllamaConfig() OllamaConfig {
	return OllamaConfig{URL: "http://127.0.0.1:11434"}
}

func NewQdrantClient(
	QdrantConfig,
) (*QdrantClient, error) {
	return &QdrantClient{}, nil
}

func NewOllamaClient(
	OllamaConfig,
) (*OllamaClient, error) {
	return &OllamaClient{}, nil
}

func Query(
	context.Context,
	VectorStore,
	Embedder,
	string,
	QueryConfig,
) ([]QueryResult, error) {
	return nil, nil
}

func QueryDocs(
	context.Context,
	string,
	string,
	int,
) ([]QueryResult, error) {
	return nil, nil
}

func FormatResultsContext(results []QueryResult) string {
	out := core.NewBuilder()
	for index, result := range results {
		if index > 0 {
			out.WriteString("\n")
		}
		out.WriteString(result.Text)
		if result.Source != "" {
			out.WriteString(" (")
			out.WriteString(result.Source)
			out.WriteString(")")
		}
	}
	return out.String()
}

func IngestDirectory(
	context.Context,
	string,
	string,
	bool,
) error {
	return nil
}

func IngestSingleFile(
	context.Context,
	string,
	string,
) (int, error) {
	return 1, nil
}

func (c *QdrantClient) Close() (
	err error,
) {
	return nil
}

func (c *QdrantClient) ListCollections(
	context.Context,
) ([]string, error) {
	return nil, nil
}

func (c *QdrantClient) CollectionInfo(
	context.Context,
	string,
) (CollectionInfo, error) {
	return CollectionInfo{Status: "ok"}, nil
}
